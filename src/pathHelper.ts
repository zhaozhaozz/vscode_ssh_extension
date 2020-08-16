import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as path from 'path';

export function findFileInPath(toolName: string): string {
	let toolPath = '';

	try {
		let output = child_process.execSync(`where ${toolName}`).toString();
		console.log(`Search ${toolName} result: ${output}`);
		output = output.split('\n')[0].trim();
		if (path.isAbsolute(output)) {
			toolPath = output;
		}
	} catch (error) {
		vscode.window.showErrorMessage(`Do not found ${toolName}, please check your PATH setting.`);
	} finally {
		console.log(`Find ${toolName} at ${toolPath}`);
		return toolPath;
	}
}

// direction: True local 2 remote, false remote 2 local
export function convertMountPath(filePath: string, direction: boolean): string {
	let result = '';
	let localBase = vscode.workspace.getConfiguration().get('sshHere.localPath', '');
	let remoteBase = vscode.workspace.getConfiguration().get('sshHere.remotePath', '');

	if (localBase === '' || remoteBase === '') {
		vscode.window.showErrorMessage('Remote path or local path error, please check config!');
	} else {
		if (direction) {
			let relative = path.relative(localBase, filePath);
			relative = relative.replace(path.sep, path.posix.sep);
			result = path.posix.resolve(remoteBase, relative);
		} else {
			let relative = path.posix.relative(remoteBase, filePath);
			relative = relative.replace(path.posix.sep, path.sep);
			result = path.resolve(localBase, relative);
		}
	}

	return result;
}
