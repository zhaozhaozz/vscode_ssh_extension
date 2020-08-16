import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as path from 'path';
import * as myExtension from '../../extension';
import * as pathhelper from '../../pathHelper';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.equal(-1, [1, 2, 3].indexOf(5));
		assert.equal(-1, [1, 2, 3].indexOf(0));
	});

	test('findFileInPath', () => {
		assert.strictEqual(pathhelper.findFileInPath('cmd') ,'C:\\Windows\\System32\\cmd.exe');
		assert.strictEqual(pathhelper.findFileInPath('fgsdfsdf') ,'');
	});

	test('convertMountPath', () => {
		let localBase = vscode.workspace.getConfiguration().get('sshHere.localPath', '');
		let remoteBase = vscode.workspace.getConfiguration().get('sshHere.remotePath', '');

		let localPath = path.resolve(localBase, 'folder\\file');
		let remotePath = path.posix.resolve(remoteBase, 'folder/file');

		assert.strictEqual(pathhelper.convertMountPath(localPath, true), remotePath);
		assert.strictEqual(pathhelper.convertMountPath(remotePath, false), localPath);
	});
});
