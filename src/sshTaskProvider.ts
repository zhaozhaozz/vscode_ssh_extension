/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as pathhelper from './pathHelper';
import * as sshhelper from './sshHelper';

interface SSHTaskDefinition extends vscode.TaskDefinition {
	file: string;
	args?: string;
}

export class SshTaskProvider implements vscode.TaskProvider {

	private sshHelper = new sshhelper.SshHelper();

	constructor() {}

	async listSh(dir: string) {
		const files = await fs.promises.readdir(dir);
		let scripts = [];

		for (const file of files) {
			if (path.extname(file) === '.sh') {
				scripts.push(file);
				console.log(file);
			}
		}

		return scripts;
	}


	public async provideTasks(): Promise<vscode.Task[]> {
		return this.getTasks();
	}

	public resolveTask(task: vscode.Task) {
		return task;
	}

	private async getTasks() {
		let tasks: vscode.Task[] = [];

		let scripts = await this.listSh(vscode.workspace.rootPath!);
		for (const script of scripts) {
			console.log(`getTasks: ${script}`);
			let execution = new vscode.ShellExecution(`cd "${pathhelper.convertMountPath(vscode.workspace.rootPath!, true)}" && ./${script}`, {
				executable: this.sshHelper.sshToolPath,
				shellArgs: this.sshHelper.sshCommonArgs});

			let task = new vscode.Task(
				{type: 'ssh', file: script},
				vscode.TaskScope.Workspace,
				script,
				'ssh',
				execution);

			tasks.push(task);
		}

		return tasks;
	}

}
