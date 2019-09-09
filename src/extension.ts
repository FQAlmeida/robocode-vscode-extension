import {
	ExtensionContext,
	commands,
	window,
	workspace,
	Uri,
	extensions,
	WorkspaceFolder
} from 'vscode';

import * as path from "path";
import * as fse from "fs-extra";

const JAVA_DEPENDENCY_VIEWER_ID = "java_dependency_viewer";

const COMMAND_CREATE = "robocode.create";

const PLACEHOLDER_PACKAGE = "What is the Package Path? e.g: robocode.tests.robots";
const PLACEHOLDER_ROBOT_NAME = "What is the Robot Name? e.g: MyFirstRobot";

const PACKAGE_ERROR_MALFORMED = "Package don't follow pattern";
const ROBOT_NAME_ERROR_MALFORMED = "Robot name don't follow pattern";

let PACKAGE_TREE: string[] | undefined = undefined;
let ROBOT_NAME: string | undefined = undefined;

function validate_package_path(path: string): boolean {
	const pattern = "^((([a-z]+)(.?)([a-z]+))+)$";
	return path.match(pattern) ? true : false;
}

function validate_robot_name(name: string): boolean {
	const pattern = "^[A-Z a-z]+$";
	return name.match(pattern) ? true : false;
}

async function ask_package_name() {
	await window.showInputBox({
		placeHolder: PLACEHOLDER_PACKAGE
	}).then(async value => {
		if (value) {
			value = value.toLowerCase();
			if (validate_package_path(value)) {
				if (value.includes('.')) {
					const path = value.split('.');
					PACKAGE_TREE = path;
				} else {
					PACKAGE_TREE = [value];
				}
			} else {
				window.showErrorMessage(PACKAGE_ERROR_MALFORMED);
				await ask_package_name();
			}
		}
	});
}

async function ask_robot_name() {
	await window.showInputBox({
		placeHolder: PLACEHOLDER_ROBOT_NAME
	}).then(async value => {
		if (value) {
			if (validate_robot_name(value)) {
				ROBOT_NAME = value;
			} else {
				window.showErrorMessage(ROBOT_NAME_ERROR_MALFORMED);
				ask_robot_name();
			}
		}
	});
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {

	let disposable = commands.registerCommand(COMMAND_CREATE, async () => {
		await ask_package_name().then(() => {
			if (PACKAGE_TREE) {
				ask_robot_name().then(async () => {
					if (ROBOT_NAME) {
						const templateRoot = path.join(context.extensionPath, "src", "templates");
						const root_path: WorkspaceFolder | undefined = workspace.workspaceFolders ?
							workspace.workspaceFolders[0] :
							undefined;
						if (root_path && ROBOT_NAME && PACKAGE_TREE) {
							await fse.ensureDir(root_path.uri.fsPath);
							await Promise.all([
								fse.copy(path.join(templateRoot, "RobotModel.java.sample"), path.join(root_path.uri.fsPath, "src", ...PACKAGE_TREE, `${ROBOT_NAME}.java`)),
								fse.copy(path.join(templateRoot, "JAVA12"), root_path.uri.fsPath),
								fse.copy(path.join(templateRoot, ".project"), path.join(root_path.uri.fsPath, ".project")),
								fse.ensureDir(path.join(root_path.uri.fsPath, "bin")),
							]);
						}
					}
				});
			}
		});

	});

	context.subscriptions.push(disposable);
}

function logs() {
	console.table([PACKAGE_TREE, ROBOT_NAME]);
}

// this method is called when your extension is deactivated
export function deactivate() { }
