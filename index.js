#! /usr/bin/env node
import { config } from 'dotenv'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { createSpinner } from 'nanospinner'
import axios from 'axios'
// load some utils function
import { findDataBasedOnValue , checkDocker , isInstalled, cmdSync } from "./utils/index.js"
import { Uninstall , install } from './utils/action.js'
import { stateSync } from './utils/action/stateSync.js'

// load enviroment
config();

// function for initialization
const __init__ = async () => {
}

const __terminal__ = async (node) => {
    while(true){
        const cmd = await inquirer.prompt({
            type: "input",
            name: "cmd",
            message: `> `
        })
        const [output , stderr , err] = await cmdSync(`docker` , ['exec' , '-i' , node?.container , ...cmd?.cmd.split(" ").map(v=> v)])
        console.log(`Output :\n ${output}`);
        console.log(`Error :\n ${stderr}`);
    }
}

const __start__ = async (params) => {
    // check if user already install docker
    const spinnerGetDocker = createSpinner(chalk.yellow("Checking docker on your machine")).start();
    const isDockerInstalled = await checkDocker(spinnerGetDocker); 
    if(!isDockerInstalled) return;
    const spinnerGetManifest = createSpinner(chalk.yellow("Getting manifest data ...")).start();
    const menus = await axios.get("https://raw.githubusercontent.com/onekill0503/dreamnode/main/manifest.json")
        .then(res => {
            spinnerGetManifest.update({text: chalk.green("Successfully get manifest data")})
            spinnerGetManifest.success();
            return res.data;
        })
        .catch(e => {
            spinnerGetManifest.update({text: chalk.red("Failed to get list of node")})
            spinnerGetManifest.error();
            return [];
        })
    
    if(menus.length < 1) return;
    const nodeAnswer = await inquirer.prompt({
        type: "list",
        name: "node",
        message: "Please select the node ?",
        choices: [...menus.map(e => e.name)]
    })
    const nodeData = findDataBasedOnValue(menus , 'name' ,nodeAnswer.node);
    const isNodeInstalled = await isInstalled(nodeData);
    const actionMenus = [];
    // the action
    if(isNodeInstalled)actionMenus.push('Uninstall' , 'Open Terminal');
    else actionMenus.push('Install');
    const actionAnswer = await inquirer.prompt({
        type: "list",
        name: "action",
        message: `What you want to do with ${nodeData?.name} ?`,
        choices: actionMenus
    })
    
    // choise the action using switch case
    switch (actionAnswer?.action) {
        case 'Install':
            const nodeQuestions = [
                {
                    type: 'input',
                    name: 'nodename',
                    message: `What's your node name ?`,
                    validate(s ) {return (s == '') ? `Don't leave it blank !` : true}
                },
                {
                    type: 'input',
                    name: 'wallet',
                    message: `What's your wallet name ?`,
                    validate(s ) {return (s == '') ? `Don't leave it blank !` : true}
                },
                {
                    type: 'input',
                    name: 'rpc',
                    message: `What's your node rpc port (ex: 26657) ?`,
                    default: `26657`,
                    validate(v){
                        return isNaN(parseInt(v)) ? "Invalid Input" : true;
                    }
                }
            ]
            // get node data + user data
            const cmd = await inquirer.prompt(nodeQuestions);
            let data = findDataBasedOnValue(menus , 'name' ,nodeAnswer.node);
            data = {...data,...cmd}
            const installSpinner = createSpinner(`${chalk.yellow("Installing node ...")}\n${chalk.bgBlue("Terminal Gonna be stuck, please be pantient")}`).start();
            await install( data, installSpinner);
            break;
        case 'Uninstall':
            const uninstallSpinner = createSpinner(`${chalk.yellow("Uninstalling node ...")}\n${chalk.bgBlue("Terminal Gonna be stuck, please be pantient")}`).start();
            await Uninstall(findDataBasedOnValue(menus , 'name' ,nodeAnswer.node) , uninstallSpinner);
            break;
        case 'Open Terminal':
            await __terminal__(nodeData);
            break;
        default:
            process.exit(1)
            break;
    }
    
}

__start__();