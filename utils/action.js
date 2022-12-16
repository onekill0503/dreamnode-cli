import axios from 'axios'
import chalk from 'chalk';
import fs from 'fs'
import { cmdSync } from './index.js';
import path from 'path';
import { isInstalled } from './index.js';
import inquirer  from 'inquirer'
import { createSpinner } from 'nanospinner'

const __stateSync__ = async (data) => {
    console.log(`Coming soon`);
}

const createDockerFile = async (data) => {
    return await axios.get(data?.dockerfile)
        .then(async (res) => {
            let dockerFile = res.data;
            let pathResolved = "";
            // replace some dynamic data
            if(data?.node_type == 'cosmos'){
                dockerFile = dockerFile.toString().replace("[chain]" , data?.chain);
                dockerFile = dockerFile.toString().replace("[nodename]" , data?.nodename);
                dockerFile = dockerFile.toString().replace("[wallet]" , data?.wallet);
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
    if(error) return false;
    return true;
}

const createDockerContainer = async (image , container , port) => {
    const [output , stderr , error] = await cmdSync('docker' , ["container" , "run" , `-it` , '-d' , '-p' , `${port}:26657` , '--name' , `${container}` , `${image}` ]);
    if(error) return false;
    return true;
}

export const Uninstall = async (data , spinner) => {
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
        spinner.update({text: chalk.red(error.message)})
        spinner.error();
        return;
    }
}

export const install = async (data , spinner) => {
    try {
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

        if(data?.node_type == `cosmos`){
            const stateSync = await inquirer.prompt({
                type: 'confirm',
                message: `You want to active state sync ? (Recommended)`,
                name: stateSync
            });
            if(stateSync?.stateSync){
                await __stateSync__(data);
            }
        }

        // success install node
        spinner.update({text: chalk.green(`Success installing node !`)})
        spinner.success();
    }catch(error){
        spinner.update({text: chalk.red(error.message)})
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