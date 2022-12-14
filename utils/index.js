import exec from 'child_process';
import chalk from 'chalk'
const spawnSync = exec.spawnSync; 

export const findDataBasedOnValue = (arr , attr , data) => {
    let result = null;
    arr.map(e => {
        if(e[attr] == data){
            result = e;
        }
    })
    return result;
}

export const cmd = async (command , arg) => {
    const result = await spawnSync(command , arg , { encoding: "utf-8" });
    return [result.stdout , result.stderr] ;
}

export const checkDocker = async (spinner) => {
    const [ output , err] = await cmd('which' , ['docker']);
    if(err){
        spinner.update({text: chalk.bgRed("You don't have docker on your machine")})
        spinner.error();
        return false;
    }
    spinner.update({text: chalk.bgGreen("We found docker !")})
    spinner.success();
    return true;
}