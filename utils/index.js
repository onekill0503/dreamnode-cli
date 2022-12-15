import exec from 'child_process';
import chalk from 'chalk'
const { spawn , spawnSync } = exec;

export const findDataBasedOnValue = (arr , attr , data) => {
    let result = null;
    arr.map(e => {
        if(e[attr] == data){
            result = e;
        }
    })
    return result;
}

export const cmdSync = async (command , arg) => {
    const result = await spawnSync(command , arg , { encoding: "utf-8" , shell: true });
    return [result.stdout , result.stderr , result.error] ;
}
export const cmd = async (command) => {
    let res = ["" , "" , false];
    const result = spawn(command);
    result.stdout.setEncoding('utf-8');
    result.stderr.setEncoding('utf-8');
    result.stdout.on('data' , data => {
        res[0] += data;
        console.log(data);
    });
    result.stderr.on('data' ,  data => {
        res[1] += data;
        console.log(data);
    });
    result.on('error' , data => res[2] = true);
    return res;
}

export const checkDocker = async (spinner) => {
    const [ output , err] = await cmdSync('which' , ['docker']);
    if(err || output == ''){
        spinner.update({text: chalk.red("You don't have docker on your machine")})
        spinner.error();
        process.exit(1)
    }
    spinner.update({text: chalk.green("We found docker !")})
    spinner.success();
    return true;
}

export const isInstalled = async (node) => {
    const [output , stderr , error] = await cmdSync('docker' , ['container' , 'list' , '|' , 'grep' , node?.container]);
    return output ? true : false;
}