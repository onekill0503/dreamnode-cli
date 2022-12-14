#! /usr/bin/env node
import { config } from 'dotenv'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { createSpinner } from 'nanospinner'
import axios from 'axios'
// load some utils function
import { findDataBasedOnValue , checkDocker } from "./utils/index.js"
import { install } from './utils/install.js'

// load enviroment
config();

// function for initialization
const __init__ = async () => {
    
}

const __start__ = async (params) => {
    // check if user already install docker
    const spinnerGetDocker = createSpinner(chalk.yellow("Checking docker on your machine")).start();
    if(!checkDocker(spinnerGetDocker)) return;
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
        message: "Which node you want to install ?",
        choices: [...menus.map(e => e.name)]
    })
    const installSpinner = createSpinner(`${chalk.yellow("Installing node ...")}\n${chalk.bgBlue("Terminal Gonna be stuck, please be pantient")}`).start();
    await install(findDataBasedOnValue(menus , 'name' ,nodeAnswer.node) , installSpinner);
}

__start__();