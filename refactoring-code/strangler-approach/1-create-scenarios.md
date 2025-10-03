# Prompt: Gather Requirements

## Step 1: Create Scenarios

Analyze the #codebase and models in public/models. List the features that would be strong candidates for E2E tests.

For each major feature area, specify requirements.

Each requirement will be written with GHERKIN like format.
Please build out each requirement/scenario.md individually. Many files are ok.

Example output format:  
/rewrite/{area}/{requirement}/{scenario}/scenario.md

Only one scenario should be in each scenario.md file. Break out related scenarios into separate folders.
Scenarios should test current app behavior, not future desired behavior.

Example output scenario:
rewrite/authentication/user_registration/registration_with_existing_email/scenario.md

Example scenario.md content:
Given an account already exists with my email
When I try to register with the same email
Then I see an error message indicating the email is already in use

## Step 2: Analyze Functions and Components

You are a software developer adding logging to a project, so other developers can see what functions are called, with what arguments, how often, and by which functions.

Terms:

{path-to-module}: file path of the current piece of code relative to the root of the project.

{name-of-code-unit}: name of the function.

Prompt the user for a folder name. Find every JavaScript file inside that folder and its sub-folders and process them.

Make a list of every code unit. A code unit is:

A component

A non-clean function

Save these lists in a new folder located in the app-requirements/code-units.

When processing a file, perform three actions. Do not skip any action.

1.Identify "non-clean" JS functions used by this project. A "clean" function is a function that would make sense to keep exactly how it was if this project was written to any other framework but the language kept in place.

2.add console.log statements to the top of each non-clean function. The console.log call should be in the format {path-to-module}:{class-name}:{name-of-code-unit} {arguments}. If an argument is an object or array, display the stringified version. If the argument is a function, display the name of the function.

3 add console.log statements right above any function call in the format {path-to-module}:{name-of-code-unit} calling {function-name} {arguments}. Ignore calls to:

require()

stopPropagation().

import

Only add console.log statements. Do not change any other part of the code. Do not add any other code.

## Step 3: Setup Standalone Environment // new chat window; otherwise started copying over rewrite directory

Configure the app-requirements folder to be standalone environment that Playwright can be run in.

Do not write any tests inside app-requirements.

Do not setup global users.

Do not make any changes outside of this folder.

Only setup playwright config, and any other necessary setup files.

The app runs in a docker container, and is accessed by port 5001.

## Step 4: Set up Global Users (specific to Bitballs app)

Use the #codebase to determine how to register and login users and what fields are required. Determine which page and selectors to use for the registration and login process. Login and registration must be done through the UI.

Do not create any new tests, only setup global users.

Create a global setup file inside app-requirements that has a function that registers two users as a global set up when tests are ran.

The users should be registered before any tests are run, and if the users already exist, do not register them again, and continue with existing users for the tests.

The first user registered will automatically be the admin, and the second will be a regular user.

The users should be able to be accessed from a reusable function.

## Step 5: Write the First Test

In the app-requirements/{path_to_test} folder, there is a scenario.md.
Based on the contents of that file, create a Playwright test next to the scenario.md file and then run the test to confirm it passes.

The app is already running, check each page for the correct html, and selectors to use. Do not make up anything that does not exist.

If it does not pass, fix it.

## Step 6: Write the rest of the tests

Write the rest of the tests for the remaining scenario.md files, and make sure to place the test files next to their respective scenario.md files.

After each test is created, run it to ensure it passes.
