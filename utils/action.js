import axios from 'axios'
import chalk from 'chalk';
import fs from 'fs'
import { cmdSync } from './index.js';
import path from 'path';
import { isInstalled } from './index.js';
import inquirer  from 'inquirer'
import { createSpinner } from 'nanospinner'

var global_output = ["" , ""];

const __stateSync__ = async (data) => {
    if(data?.stateSync){
        const stateSync = await inquirer.prompt({
            type: 'confirm',
            message: `${chalk.green('State Sync is available for this node.')}\n${chalk.yellow('You want to activate it ?')}`,
            name: 'answer'
        });
        if(stateSync?.answer){
            // get last block
            const lastBlock = await axios.get(`${data?.stateSync}/block`)
                .then(res => res.data.result.block.header.height)
                .catch(err => {
                    return -1;
                })
            if (lastBlock < 0) {
                console.log(chalk.yellow(`Can't get the last block, skip stateSync`));
                return false;
            }
            const trustBlock = await inquirer.prompt({
                type: 'input',
                name: 'answer',
                message: 'Please input trust block : ',
                default: (lastBlock - 5000),
                validate(v){
                    if(isNaN(parseInt(v))) return `Please input valid number`;
                    if(v > lastBlock) return `Trust block must less than ${lastBlock} (Last Block)`
                    return true;
                }
            })
            // get trust hash
            const trustHash = await axios.get(`${data?.stateSync}/block?height=${trustBlock?.answer}`)
                .then(res => res.data.result.block_id.hash)
                .catch(err => {
                    return -1;
                })
            // if failed to get block data
            if (trustHash < 0) {
                console.log(chalk.yellow(`Can't get data from block ${trustBlock?.answer}, skip stateSync`));
                return false;
            }
            let rpcHost = data?.stateSync;
            rpcHost = rpcHost.replaceAll("/" , "\\/");
            rpcHost = rpcHost.replaceAll(":" , "\\:");
            let results = `RUN sed -i -e "s/^enable *=.*/enable = true/" /root/.humans/config/config.toml \\ \n`;
            results += `&& sed -i -e "s/^rpc_servers *=.*/rpc_servers = \\"${rpcHost},${rpcHost}\\"/" /root/.humans/config/config.toml \\ \n`;
            results += `&& sed -i -e "s/^trust_height *=.*/trust_height = \\"${trustBlock?.answer}\\"/" /root/.humans/config/config.toml \\ \n`
            results += `&& sed -i -e "s/^trust_hash *=.*/trust_hash = \\"${trustHash}\\"/" /root/.humans/config/config.toml \\ \n`
            results += `&& sed -i -e "s/^trust_period *=.*/trust_period = \\"168h\\"/" /root/.humans/config/config.toml\n`
            return results;
        }
    }else return false;
}

const getPeers = async (url) => {
    return await axios.get(url).then(res => res.data).catch(err => '');
}

const createDockerFile = async (data) => {
    return await axios.get(data?.dockerfile)
        .then(async (res) => {
            let dockerFile = res.data;
            let pathResolved = "";
            // replace some dynamic data
            if(data?.node_type == 'cosmos'){
                const peers = await getPeers(data?.peers);
                const finalState = data?.stateSync == false ? '' : data?.stateSync;
                dockerFile = dockerFile.toString().replace("[chain]" , data?.chain);
                dockerFile = dockerFile.toString().replace("[nodename]" , data?.nodename);
                dockerFile = dockerFile.toString().replace("[wallet]" , data?.wallet);
                dockerFile = dockerFile.toString().replace("[peers]" , peers.replaceAll('\n',','));
                dockerFile = dockerFile.toString().replace("[stateSync]" , finalState);

                pathResolved = path.resolve(path.join(process.cwd() , 'Dockerfile'));
            }else {
                return false;
            }
            await fs.writeFileSync(pathResolved , dockerFile);
            return true;
        })
        .catch(err => {
            return false;
        })
}

const createDockerImage = async (image) => {
    const [output , stderr , error] = await cmdSync('docker' , ["build" , `-t` , ` ${image}` , `.` ]);

    // put output at global variabel;
    global_output[0] += output;
    global_output[1] += stderr;

    if(error) return false;
    return true;
}

const createDockerContainer = async (image , container , port) => {
    const [output , stderr , error] = await cmdSync('docker' , ["container" , "run" , `-it` , '-d' , '-p' , `${port}:26657` , '-p' , `${(parseInt(port) + 1)}:1317` , '--name' , `${container}` , `${image}` ]);

    // put output at global variabel;
    global_output[0] += output;
    global_output[1] += stderr;

    if(error) return false;
    return true;
}

export const Uninstall = async (data , spinner) => {
    global_output = ["" , ""];
    try {
        // stop container first
        const stopContainer = await cmdSync('docker' , ['container' , 'stop' , data?.container]);
        if(!stopContainer){
            throw new Error('Failed to stop container');
        }
        // remove container
        const removeContainer = await cmdSync('docker' , ['container' , 'rm' , data?.container]);
        if(!removeContainer){
            throw new Error('Failed to remove container');
        }
        // remove image
        const removeImage = await cmdSync('docker' , ['image' , 'rm' , data?.image]);
        if(!removeImage){
            throw new Error('Failed to remove image');
        }
        spinner.update({text: chalk.green(`Success Uninstalling node !`)})
        spinner.success();
    } catch (error) {
        console.log(`Error :\n${global_output[1]}`);
        spinner.update({text: chalk.red(error.message)});
        spinner.error();
        return;
    }
}

export const install = async (data , spinner) => {
    global_output = ["" , ""];
    try {
        // check node type
        if(data?.node_type == `cosmos`){
            spinner.stop();
            // if cosmos offer stateSycn
            data.stateSync = await __stateSync__(data);
        }
        spinner.start();
        // create docker file
        const createDocker = await createDockerFile(data);
        if(!createDocker) throw new Error("Failed to create docker file");
        // create docker image
        const createImage = await createDockerImage(data?.image, data?.name)
        if(!createImage) throw new Error("Failed to create docker image");
        // create docker container
        const createContainer = await createDockerContainer(data?.image, data?.container , data?.rpc)
        if(!createContainer) throw new Error("Failed to create docker container");
        // remove dockerFile
        await fs.unlinkSync(path.resolve(path.join(process.cwd() , 'Dockerfile')))
        // check if node installed correctly
        const isInstalledCorrectly = await isInstalled(data);
        if(!isInstalledCorrectly){
            throw new Error(`Node not installed correctly, please restart the app`);
        }

        // success install node
        spinner.update({text: chalk.green(`Success installing node !`)})
        spinner.success();
    }catch(error){
        console.log(`Error :\n${global_output[1]}`);
        spinner.update({text: chalk.red(error.message)});
        spinner.error();
        return;
    }
}

const InstallDockerCmd = async () => {
    // get bash file to install docker
    const getFile = await cmdSync(`curl` , ['fsSL' , 'https://get.docker.com' , '-o' , 'get-docker.sh']);
    if(!getFile) return false;
    // start to installing docker
    const installing = await cmdSync(`sh` , ['./get-docker.sh'])
    if(!installing) return false;

    // success return true
    return true;
}

export const missingDocker = async () => {
    if(process.platform == 'win32'){
        console.log(chalk.red(`Please install docker first\nDownload Docker here : https://www.docker.com/products/docker-desktop/`));
    }else{
        const installDocker = await inquirer.prompt({
            type: 'confirm',
            message: 'You want install it now ?',
            name: `answer`
        })
        if(installDocker?.answer){
            const spinner = createSpinner(chalk.yellow(`Installing docker ...`)).start();
            const installing = await InstallDockerCmd();
            if(!installing) {
                spinner.update({text: chalk.red(`Failed to install docker, try to install manully`)});
                spinner.error();
                process.exit();
            }
            spinner.update({text: chalk.green(`Docker successfully installed !\nRun this program again.`)})
        }
        process.exit(1);
    }
}