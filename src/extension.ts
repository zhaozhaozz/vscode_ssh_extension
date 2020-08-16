// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as sshhelper from './sshHelper';
import * as pathhelper from './pathHelper';
import * as sshtaskprovider from './sshTaskProvider';

let sshTaskProvider: vscode.Disposable | undefined;
let sshRunner:sshhelper.SshHelper | undefined;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "ssh-here" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json

	context.subscriptions.push(vscode.commands.registerCommand('ssh-here.configSshkey', () => {
		let sshHelper = new sshhelper.SshHelper();
		sshHelper.configSshKeyToServer();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('ssh-here.openSshTerminal', () => {
		let sshHelper = new sshhelper.SshHelper();
		sshHelper.openSshTerminal();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('ssh-here.openSshTerminalFolder', (uri: vscode.Uri) => {
		let sshHelper = new sshhelper.SshHelper();
		let folder = pathhelper.convertMountPath(uri.fsPath, true);
		sshHelper.openSshTerminal(folder);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('ssh-here.runSshTerminalScript', (uri: vscode.Uri) => {
		if (sshRunner === undefined) {
			sshRunner = new sshhelper.SshHelper();
		}
		let file = pathhelper.convertMountPath(uri.fsPath, true);
		sshRunner.openSshTerminal();
		sshRunner.runScript(file);
	}));

	sshTaskProvider = vscode.tasks.registerTaskProvider('ssh', new sshtaskprovider.SshTaskProvider());
}

// this method is called when your extension is deactivated
export function deactivate(): void {
	if (sshTaskProvider) {
		sshTaskProvider.dispose();
	}

	sshRunner = undefined;
}
