import { config } from 'dotenv'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { createSpinner } from 'nanospinner'
import axios from 'axios'
// load some utils function
import { findDataBasedOnValue , checkDocker } from "./utils/index.js"

// load enviroment
config();

// function for initialization
const __init__ = async () => {
    
}

const __start__ = async (params) => {
    // check if user already install docker
    const spinnerGetDocker = createSpinner(chalk.bgYellow("Checking docker on your machine")).start();
    if(!checkDocker(spinnerGetDocker)) return;
    const spinnerGetManifest = createSpinner(chalk.bgYellow("Getting manifest data ...")).start();
    const menus = await axios.get(process.env.manifest)
        .then(res => {
            spinnerGetManifest.update({text: chalk.bgGreen("Successfully get manifest data")})
            spinnerGetManifest.success();
            return res.data;
        })
        .catch(e => {
            spinnerGetManifest.update({text: chalk.bgRed("Failed to get list of node")})
            spinnerGetManifest.error();
            return [];
        })
    
    const nodeAnswer = await inquirer.prompt({
        type: "list",
        name: "node",
        message: "Which node you want to install ?",
        choices: [...menus.map(e => e.name)]
    })
}

__start__();