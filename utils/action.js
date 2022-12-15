import axios from 'axios'
import chalk from 'chalk';
import fs from 'fs'
import { cmd , cmdSync } from './index.js';
import path from 'path';

const createDockerFile = async (dockerFileUrl , name) => {
    return await axios.get(dockerFileUrl)
        .then(async (res) => {
            let dockerFile = res.data;
            // replace some dynamic data
            dockerFile = dockerFile.toString().replace("[chain]" , "mainnet");
            dockerFile = dockerFile.toString().replace("[nodename]" , "alwaysbedrean");
            dockerFile = dockerFile.toString().replace("[wallet]" , "wallet");
            let pathResolved = path.resolve(path.join(process.cwd() , 'Dockerfile'))
            await fs.writeFileSync(pathResolved , dockerFile);
            return true;
        })
        .catch(err => {
            return false;
        })
}

const createDockerImage = async (image) => {
    const [output , stderr , error] = await cmdSync('docker' , ["build" , `-t` , ` ${image}` , `.` ])
    if(error) return false;
    return true;
}

const createDockerContainer = async (image , container) => {
    const [output , stderr , error] = await cmdSync('docker' , ["container" , "run" , `-it` , '-d', '--name' , `${container}` , `${image}` ])
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
        // // remove image
        // const removeImage = await cmdSync('docker' , ['image' , 'rm' , data?.image]);
        // if(!removeImage){
        //     throw new Error('Failed to remove image');
        // }
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
        const createDocker = await createDockerFile(data?.dockerfile , data?.name);
        if(!createDocker) throw new Error("Failed to create docker file");
        // create docker image
        const createImage = await createDockerImage(data?.image, data?.name)
        if(!createImage) throw new Error("Failed to create docker image");
        // create docker container
        const createContainer = await createDockerContainer(data?.image, data?.container)
        if(!createContainer) throw new Error("Failed to create docker container");
        // remove dockerFile
        await fs.unlinkSync(path.resolve(path.join(process.cwd() , 'Dockerfile')))
        spinner.update({text: chalk.green(`Success installing node !`)})
        spinner.success();
    }catch(error){
        spinner.update({text: chalk.red(error.message)})
        spinner.error();
        return;
    }
}