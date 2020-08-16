import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import * as pathhelper from './pathHelper';


class SshPseudoterminal implements vscode.Pseudoterminal {
	private writeEmitter = new vscode.EventEmitter<string>();
	onDidWrite: vscode.Event<string> = this.writeEmitter.event;
	private closeEmitter = new vscode.EventEmitter<void>();
	onDidClose?: vscode.Event<void> = this.closeEmitter.event;

	line = '';

	open(initialDimensions: vscode.TerminalDimensions | undefined): void {
		this.writeData('SSH pseudo terminal start!\r\n\r\n');
	}

	close(): void {

	}

	handleInput(data: string) {
		if (data === '\r') { // Enter
			this.writeData(`\r\necho: "${this.line}"\r\n\n`);
			this.line = '';
			return;
		}
		if (data === '\x7f') { // Backspace
			if (this.line.length === 0) {
				return;
			}
			this.line = this.line.substr(0, this.line.length - 1);
			// Move cursor backward
			this.writeData('\x1b[D');
			// Delete character
			this.writeData('\x1b[P');
			return;
		}
		this.line += data;
		this.writeData(data);
	}

	writeData(data: string) {
		this.writeEmitter.fire(data);
	}
}

export class SshHelper {
	sshToolPath: string;
	sshUser: string;
	sshServer: string;
	sshPort: number;
    sshKeyPath: string;

    sshCommonArgs: string[];

    sshTerminal: vscode.Terminal | undefined;

	constructor() {
		this.sshToolPath = pathhelper.findFileInPath('ssh');
		this.sshUser = this.getSshUser();
		this.sshKeyPath = this.getSshKeyPath();
		this.sshServer = vscode.workspace.getConfiguration().get('sshHere.serverAddress', "127.0.0.1");
        this.sshPort = vscode.workspace.getConfiguration().get('sshHere.port', 22);

        this.sshCommonArgs = [
            '-l', this.sshUser,
            '-p', `${this.sshPort}`,
            '-i', `"${this.sshKeyPath}"`,
            this.sshServer
        ];
    }

	getSshUser(): string {
		let sshUser = '';

		let config_value = vscode.workspace.getConfiguration().get('sshHere.userName', '').trim();
		if (config_value === '') {
			vscode.window.showErrorMessage("User name is empty.");
		} else {
			sshUser = config_value;
		}

		return sshUser;
	}

	getSshKeyPath(): string {
		let sshKeyPath = '';

		let config_value = vscode.workspace.getConfiguration().get('sshHere.keyLocation', '.ssh/id_rsa');
		if (path.isAbsolute(config_value)) {
			sshKeyPath = config_value;
		} else {
			sshKeyPath = path.resolve(os.homedir(), config_value);
		}

		console.log(`SSH key at ${sshKeyPath}`);
		return sshKeyPath;
	}

	private copySshKeyToServer(pseudoTerminal: vscode.Terminal) {
		pseudoTerminal.sendText(`\r\nStart copy ssh key.\r\n`);

		let pubkeyPath = this.sshKeyPath + '.pub';
		if (!fs.existsSync(pubkeyPath)) {
			vscode.window.showErrorMessage(`Can not find public key file: ${pubkeyPath}!`);
		} else {
			let pubkey = fs.promises.readFile(pubkeyPath, { encoding: 'utf-8' });

			let addToServer = (pubKey: string) => {
				let sshTerminal = vscode.window.createTerminal('SSH', this.sshToolPath, [
					'-l', this.sshUser,
					'-p', `${this.sshPort}`,
					this.sshServer,
					`mkdir -p ~/.ssh && echo "${pubKey}" >> ~/.ssh/authorized_keys && chmod go-w ~/ && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys`
				]);

				sshTerminal.show();
				pseudoTerminal.sendText(`\r\nCopy ssh key done.\r\n`);
			};

			pubkey.then(addToServer).catch((error) => { pseudoTerminal.sendText(error); });
		}
	}

	private genSshKey(pseudoTerminal: vscode.Terminal) {
		pseudoTerminal.sendText(`Start generate new key at ${this.sshKeyPath}`);

		let keygenPath = pathhelper.findFileInPath('ssh-keygen');
		let keygen = child_process.spawn(keygenPath, ['-t', 'rsa', '-b', '4096', '-N', '', '-f', this.sshKeyPath]);

		let stdout = '';
		keygen.stdout.on('data', (data) => {
			stdout += `${data}`;
		});

		keygen.stderr.on('data', (data) => {
			stdout += `${data}`;
		});

		keygen.on('close', (code) => {
			stdout = stdout.replace('\r', '\r\n');
			pseudoTerminal.sendText(stdout);

			pseudoTerminal.sendText(`SSH keygen exit with ${code}`);

			if (code !== 0) {
				vscode.window.showErrorMessage('SSH keygen failed!');
			} else {
				this.copySshKeyToServer(pseudoTerminal);
			}
		});

		keygen.on('error', (err) => {
			pseudoTerminal.sendText(`Failed to start keygen. ${err}`);
		});
	}

	configSshKeyToServer() {
		const writeEmitter = new vscode.EventEmitter<string>();
		const pty = {
			onDidWrite: writeEmitter.event,
			open: () => writeEmitter.fire('Start config ssh key.\r\n\r\n'),
			close: () => { /* noop*/ },
			handleInput: (data: string) => {
				for (let i = 0; i < data.length; i++) {
					if (data[i] === '\r') {
						writeEmitter.fire(`\r\n`);
						continue;
					}

					writeEmitter.fire(data[i]);
				}
			}
		};

		let pseudoTerminal = vscode.window.createTerminal({ name: 'SSH key config', pty: pty });
		pseudoTerminal.show();

		if (!fs.existsSync(this.sshKeyPath)) {
			this.genSshKey(pseudoTerminal);
		} else {
			this.copySshKeyToServer(pseudoTerminal);
		}
    }

    sendCommand(command: string) {
        if (this.sshTerminal === undefined) {
            this.openSshTerminal();
        }

        this.sshTerminal?.sendText(`${command}\r\n`);
    }

	openSshTerminal(pwd?: string) {
        console.log(`openSshTerminal: ${this.sshTerminal?.exitStatus?.code}`);

        if (this.sshTerminal === undefined || this.sshTerminal.exitStatus?.code !== 0) {
            let name = 'SSH';
            if (pwd !== undefined) {
                name += ' ' + pwd;
            }

            this.sshTerminal = vscode.window.createTerminal(name, this.sshToolPath, this.sshCommonArgs);
        }

		this.sshTerminal.show();

        this.changeDir(pwd);
    }

    changeDir(dir: string | undefined) {
        if (dir !== undefined) {
            this.sendCommand(`cd ${dir}`);
        }
    }

    runScript(file: string) {
        let dir = path.posix.dirname(file);

        this.changeDir(dir);
        this.sendCommand(`${file}`);
    }

}
