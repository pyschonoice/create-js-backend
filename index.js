#!/usr/bin/env node


import { program } from "commander";
import inquirer from "inquirer";
import fs from "fs-extra";
import chalk from "chalk";
import path from "path";
import ora from "ora";
import {execa} from "execa";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define CLI command and arguments
program
  .name("create-js-backend")
  .description("A CLI to create new Node.js backend projects with boilerplate.")
  .version("1.0.0");

program
  .argument("<project-name>", "Name of the new project (for directory and initial setup)")
  .action(async (initialProjectName) => {
    // Determine target directory
    const targetDir = path.join(process.cwd(), initialProjectName);
    const boilerplateDir = path.join(__dirname, "boilerplate"); // Path to your boilerplate

    console.log(chalk.blue(`\nCreating new project: ${initialProjectName}\n`));

    // Check if directory already exists
    if (fs.existsSync(targetDir)) {
      const { overwrite } = await inquirer.prompt([
        {
          type: "confirm",
          name: "overwrite",
          message: `Directory "${initialProjectName}" already exists. Overwrite?`,
          default: false,
        },
      ]);
      if (overwrite) {
        const spinner = ora(chalk.yellow("Removing existing directory...")).start();
        try {
          await fs.remove(targetDir);
          spinner.succeed(chalk.green("Existing directory removed."));
        } catch (err) {
          spinner.fail(chalk.red("Failed to remove existing directory."));
          console.error(chalk.red(err.message));
          process.exit(1);
        }
      } else {
        console.log(chalk.yellow("Aborting project creation."));
        process.exit(0);
      }
    }

    // 1. Scaffolding: Copy boilerplate files
    const copySpinner = ora("Copying boilerplate files...").start();
    try {
      await fs.copy(boilerplateDir, targetDir, {
        overwrite: true,
        recursive: true,
      });
      copySpinner.succeed(chalk.green("Boilerplate copied!"));
    } catch (err) {
      copySpinner.fail(chalk.red("Error copying boilerplate!"));
      console.error(chalk.red(err.message));
      process.exit(1);
    }

    // Change current working directory to the new project for npm commands
    process.chdir(targetDir);

    // 2. Interactive npm init for project metadata
    console.log(chalk.magenta("\n--- Project Metadata Setup ---"));
    console.log(chalk.gray("This will guide you through setting up package.json."));

    const npmInitAnswers = await inquirer.prompt([
      {
        type: "input",
        name: "name",
        message: "package name:",
        default: path.basename(targetDir), // Default to folder name
        validate: (input) =>
          input.length > 0 || "Package name cannot be empty.",
      },
      {
        type: "input",
        name: "description",
        message: "description:",
        default: "Boilerplate for JavaScript backend application",
      },
      {
        type: "input",
        name: "version",
        message: "version:",
        default: "1.0.0",
      },
      {
        type: "input",
        name: "author",
        message: "author:",
        default: "", // Can pre-fill from global git config
      },
      {
        type: "list", // or 'input' if you prefer free text
        name: "license",
        message: "license:",
        choices: ["ISC", "MIT", "UNLICENSED"],
        default: "ISC",
      },
      {
        type: "input",
        name: "main",
        message: "entry point:",
        default: "index.js", // Based on your boilerplate
      },
      
    ]);

    // Read the package.json that was copied from boilerplate
    const packageJsonPath = path.join(targetDir, "package.json");
    let packageJson = await fs.readJson(packageJsonPath);

    // Merge/overwrite with user's answers
    Object.assign(packageJson, npmInitAnswers);



    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
    console.log(chalk.green("package.json updated with your details!"));

    // --- User Input  ---
    const otherAnswers = await inquirer.prompt([
      {
        type: "confirm",
        name: "installDeps",
        message: "Install npm dependencies (npm install)?",
        default: true,
      },
    ]);

    // 3. Dependency Installation
    if (otherAnswers.installDeps) {
      const installSpinner = ora("Installing npm dependencies...").start();
      try {
        await execa("npm", ["install"], { cwd: targetDir });
        installSpinner.succeed(chalk.green("Dependencies installed!"));
      } catch (err) {
        installSpinner.fail(chalk.red("Dependency installation failed!"));
        console.error(chalk.red(err.message));
        // Don't exit here, as the project is still created, just deps failed
      }
    }

    // 4. Git Initialization
    const gitSpinner = ora("Initializing Git repository...").start();
    try {
      await execa("git", ["init"], { cwd: targetDir });
      gitSpinner.succeed(chalk.green("Git repository initialized!"));
    } catch (err) {
      gitSpinner.fail(chalk.red("Git initialization failed!"));
      console.error(chalk.red(err.message));
      // Git init failure is not critical, so don't exit
    }

    // Final success message and next steps
    console.log(chalk.green(`\n🎉 Project "${initialProjectName}" created successfully!`));
    console.log(chalk.cyan(`\nNext steps:`));
    console.log(chalk.cyan(`  cd ${initialProjectName}`));
    if (!otherAnswers.installDeps) {
      console.log(chalk.cyan(`  npm install`));
    }
    console.log(chalk.cyan(`  npm run dev (or npm start)`));
    console.log(chalk.cyan(`  Don't forget to configure your .env file!`));
    console.log("\nHappy coding!");
  });

// Parse command line arguments
program.parse(process.argv);