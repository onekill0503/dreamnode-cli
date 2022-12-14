import axios from 'axios'
import chalk from 'chalk';
import fs from 'fs'
import { cmd } from './index.js';

const createDockerFile = async (dockerFileUrl , name) => {
    return await axios.get(dockerFileUrl)
        .then(async (res) => {
            let dockerFile = res.data;
            // replace some dynamic data
            dockerFile = dockerFile.toString().replace("[chain]" , "mainnet");
            dockerFile = dockerFile.toString().replace("[nodename]" , "alwaysbedrean");
            dockerFile = dockerFile.toString().replace("[wallet]" , "wallet");
            await fs.writeFileSync(`${process.cwd()}\\Dockerfile` , dockerFile);
            return true;
        })
        .catch(err => {
            return false;
        })
}

const createDockerImage = async (image) => {
    const [output , stderr , error] = await cmd('docker' , ["build" , `-t` , ` ${image}` , `.` ])
    if(error) return false;
    return true;
}

const createDockerContainer = async (image , container) => {
    const [output , stderr , error] = await cmd('docker' , ["container" , "run" , `-it` , '-d', '--name' , `${container}` , `${image}` ])
    if(error) return false;
    return true;
}

export const install = async (data , spinner) => {
    // create docker file
    const createDocker = await createDockerFile(data?.dockerfile , data?.name);
    if(!createDocker){
        spinner.update({text: chalk.red("Failed to create docker file")})
        spinner.error();
        return;
    }
    // create docker image
    const createImage = await createDockerImage(data?.image, data?.name)
    if(!createImage){
        spinner.update({text: chalk.red("Failed to create docker image")})
        spinner.error();
        return;
    }
    // create docker container
    const createContainer = await createDockerContainer(data?.image, data?.container)
    if(!createContainer){
        spinner.update({text: chalk.red("Failed to create docker container")})
        spinner.error();
        return;
    }
    spinner.update({text: chalk.green(`Success installing node !`)})
    spinner.success();
}