'use strict';
/** 
 * @author github.com/tintinweb
 * @author github.com/jsbinette
 * 
 * 
 * */
/** imports */
const vscode = require('vscode');
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const settings = require('../settings');
const os = require("os");
const { minimatch } = require('minimatch')

class Commands {
    constructor(controller) {
        this.controller = controller;
    }

    refresh() {
        Object.keys(this.controller.bookmarks).forEach(uri => {
            vscode.workspace.openTextDocument(vscode.Uri.parse(uri)).then(document => {
                this.controller.updateBookmarks(document);
            });
        }, this);
    }

    showSelectBookmark(filter, placeHolder) {

        let entries = [];
        Object.keys(this.controller.bookmarks).forEach(uri => {
            let resource = vscode.Uri.parse(uri).fsPath;
            let fname = path.parse(resource).base;

            if (filter && !filter(resource)) {
                return;
            }

            Object.keys(this.controller.bookmarks[uri]).forEach(cat => {
                this.controller.bookmarks[uri][cat].forEach(b => {
                    entries.push({
                        label: b.text,
                        description: fname,
                        target: new vscode.Location(resource, b.range)
                    });
                });
            });

        }, this);

        vscode.window.showQuickPick(entries, { placeHolder: placeHolder || 'Select bookmarks' }).then(item => {
            vscode.commands.executeCommand("instructions.jumpToRange", item.target.uri, item.target.range);
        });
    }

    showSelectVisibleBookmark() {
        let visibleEditorUris = vscode.window.visibleTextEditors.map(te => te.document.uri.fsPath);
        this.showSelectBookmark((resFsPath) => visibleEditorUris.includes(resFsPath), "Select visible bookmarks");
    }

    showListBookmarks(filter) {

        if (!vscode.window.outputChannel) {
            vscode.window.outputChannel = vscode.window.createOutputChannel('instructions');
        }

        if (!vscode.window.outputChannel) return;
        vscode.window.outputChannel.clear();

        let entries = [];
        Object.keys(this.controller.bookmarks).forEach(uri => {
            let resource = vscode.Uri.parse(uri).fsPath;
            let fname = path.parse(resource).base;

            if (filter && !filter(resource)) {
                return;
            }

            Object.keys(this.controller.bookmarks[uri]).forEach(cat => {
                this.controller.bookmarks[uri][cat].forEach(b => {
                    entries.push({
                        label: b.text,
                        description: fname,
                        target: new vscode.Location(resource, b.range)
                    });
                });
            });

        }, this);

        if (entries.length === 0) {
            vscode.window.showInformationMessage('No results');
            return;
        }

        entries.forEach(function (v, i, a) {
            var patternA = '#' + (i + 1) + '\t' + v.target.uri + '#' + (v.target.range.start.line + 1);
            var patternB = '#' + (i + 1) + '\t' + v.target.uri + ':' + (v.target.range.start.line + 1) + ':' + (v.target.range.start.character + 1);
            var patterns = [patternA, patternB];

            var patternType = 0;
            if (os.platform() == "linux") {
                patternType = 1;
            }
            patternType = +!patternType;

            vscode.window.outputChannel.appendLine(patterns[patternType]);
            vscode.window.outputChannel.appendLine('\t' + v.label + '\n');
        });
        vscode.window.outputChannel.show();
    }

    showListVisibleBookmarks() {
        let visibleEditorUris = vscode.window.visibleTextEditors.map(te => te.document.uri.fsPath);
        this.showListBookmarks((resFsPath) => visibleEditorUris.includes(resFsPath));
    }

    scanWorkspaceBookmarks() {

        let that = this;

        vscode.workspace.findFiles(this.includePattern, this.excludePattern, this.maxFilesLimit).then(function (files) {

            if (!files || files.length === 0) {
                console.log('No files found');
                return;
            }

            var totalFiles = files.length;

            for (var i = 0; i < totalFiles; i++) {

                vscode.workspace.openTextDocument(files[i]).then((document) => {
                    that.controller.updateBookmarks(document);
                    //NOP
                }, (err) => {
                    console.error(err);
                });

            }

        }, (err) => {
            console.error(err);
        });
    }

}

class instructionsCtrl {

    constructor(context) {
        this.context = context;
        this.styles = this._reLoadDecorations();
        this.words = this._reLoadWords();

        this.commands = new Commands(this);

        this.bookmarks = {};  // {file: {bookmark}}


        function arrayToSearchGlobPattern(config) {
            return Array.isArray(config) ?
                '{' + config.join(',') + '}'
                : (typeof config == 'string' ? config : '');
        }

        this.includePattern = arrayToSearchGlobPattern(settings.extensionConfig().search.includes) || '{**/*}';
        this.excludePattern = arrayToSearchGlobPattern(settings.extensionConfig().search.excludes);
        this.maxFilesLimit = settings.extensionConfig().search.maxFiles;


        this.loadFromWorkspace();
    }

    /** -- public -- */

    hasBookmarks() {
        return !!this.bookmarks;
    }

    async decorate(editor) {
        if (!editor || !editor.document /*|| editor.document.fileName.startsWith("extension-output-")*/) return; //decorate list of inline comments
        if (minimatch(editor.document.fileName, this.excludePattern)) return;
        this._clearBookmarksOfFile(editor.document);

        if (this._extensionIsBlacklisted(editor.document.fileName)) return;

        for (var style in this.words) {
            if (!this.words.hasOwnProperty(style) || this.words[style].length == 0 || this._wordIsOnIgnoreList(this.words[style])) {
                continue;
            }
            this._decorateWords(editor, this.words[style], style, editor.document.fileName.startsWith("extension-output-")); //dont add to bookmarks if we're decorating an extension-output
        }

        this.saveToWorkspace(); //update workspace
    }

    async updateBookmarks(document) {
        if (!document || document.fileName.startsWith("extension-output-")) return;

        this._clearBookmarksOfFile(document);

        if (this._extensionIsBlacklisted(document.fileName)) return;

        for (var style in this.words) {
            if (!this.words.hasOwnProperty(style) || this.words[style].length == 0 || this._wordIsOnIgnoreList(this.words[style])) {
                continue;
            }
            this._updateBookmarksForWordAndStyle(document, this.words[style], style);
        }

        this.saveToWorkspace(); //update workspace
    }

    /** -- private -- */

    _extensionIsBlacklisted(fileName) {
        let ignoreList = settings.extensionConfig().exceptions.file.extensions.ignore;
        if (!ignoreList || ignoreList.length === 0) return false;
        if (minimatch(fileName, this.excludePattern)) return false;
        return this._commaSeparatedStringToUniqueList(ignoreList).some(ext => fileName.endsWith(ext.trim()));
    }

    _wordIsOnIgnoreList(word) {
        let ignoreList = settings.extensionConfig().exceptions.words.ignore;
        return this._commaSeparatedStringToUniqueList(ignoreList).some(ignoreWord => word.startsWith(ignoreWord.trim()));
    }

    _commaSeparatedStringToUniqueList(s) {
        if (!s) return [];
        return [...new Set(s.trim().split(',').map(e => e.trim()).filter(e => e.length))];
    }

    async _decorateWords(editor, words, style, noAdd) {
        const decoStyle = this.styles[style].type || this.styles['default'].type;

        let locations = this._findWords(editor.document, words);
        editor.setDecorations(decoStyle, locations);  // set decorations

        if (locations.length && !noAdd)
            this._addBookmark(editor.document, style, locations);
    }

    async _updateBookmarksForWordAndStyle(document, words, style) {

        let locations = this._findWords(document, words);

        if (locations.length)
            this._addBookmark(document, style, locations);
    }

    _findWords(document, words) {
        const text = document.getText();
        var locations = [];

        words.forEach(function (word) {

            var regEx = new RegExp(word, "g");
            let match;
            while (match = regEx.exec(text)) {

                var startPos = document.positionAt(match.index);
                var endPos = document.positionAt(match.index + match[0].trim().length);

                var fullLine = document.getWordRangeAtPosition(startPos, /(.+)$/);

                var decoration = {
                    range: new vscode.Range(startPos, endPos),
                    text: document.getText(new vscode.Range(startPos, fullLine.end))
                };

                locations.push(decoration);
            }
        });

        return locations;
    }

    _clearBookmarksOfFile(document) {
        let filename = document.uri;
        if (!this.bookmarks.hasOwnProperty(filename)) return;
        delete this.bookmarks[filename];
    }

    _clearBookmarksOfFileAndStyle(document, style) {
        let filename = document.uri;
        if (!this.bookmarks.hasOwnProperty(filename)) return;
        delete this.bookmarks[filename][style];
    }

    _addBookmark(document, style, locations) {
        let filename = document.uri;
        if (!this.bookmarks.hasOwnProperty(filename)) {
            this.bookmarks[filename] = {};
        }
        this.bookmarks[filename][style] = locations;
    }

    _reLoadWords() {
        let defaultWords = {  // style: arr(regexWords)
            "blue": this._commaSeparatedStringToUniqueList(settings.extensionConfig().default.words.blue),
            "purple": this._commaSeparatedStringToUniqueList(settings.extensionConfig().default.words.purple),
            "green": this._commaSeparatedStringToUniqueList(settings.extensionConfig().default.words.green),
            "red": this._commaSeparatedStringToUniqueList(settings.extensionConfig().default.words.red)
        };

        return { ...defaultWords, ...settings.extensionConfig().expert.custom.words.mapping };
    }

    _getBookmarkDataUri(color) {
        return vscode.Uri.parse(
            "data:image/svg+xml," +
            encodeURIComponent(`<svg version="1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" enable-background="new 0 0 48 48"><path fill="${color}" d="M37,43l-13-6l-13,6V9c0-2.2,1.8-4,4-4h18c2.2,0,4,1.8,4,4V43z"/></svg>`)
        );
    }

    _getDecorationStyle(decoOptions) {
        return { type: vscode.window.createTextEditorDecorationType(decoOptions), options: decoOptions };
    }

    _getDecorationDefaultStyle(color) {
        return this._getDecorationStyle({
            "gutterIconPath": this._getBookmarkDataUri(color), 
            "overviewRulerColor": color + "B0",   // this is safe/suitable for the defaults only.  Custom ruler color is handled below.
            "light": {
                "fontWeight": "bold"
            },
            "dark": {
                "color": color
            }
        })
    }

    _reLoadDecorations() {
        const blue = '#1874e2';
        const green = '#10a37f';
        const purple = '#C679E0';
        const red = '#F44336';
        let styles = {
            "default": this._getDecorationDefaultStyle(blue),
            "red": this._getDecorationDefaultStyle(red),
            "blue": this._getDecorationDefaultStyle(blue),
            "green": this._getDecorationDefaultStyle(green),
            "purple": this._getDecorationDefaultStyle(purple)
        };

        let customStyles = settings.extensionConfig().expert.custom.styles;

        for (var decoId in customStyles) {

            if (!customStyles.hasOwnProperty(decoId)) {
                continue;
            }

            let decoOptions = { ...customStyles[decoId] };

            // default to blue if neither an icon path nor an icon color is specified
            if (!decoOptions.gutterIconPath) {
                decoOptions.gutterIconColor = decoOptions.gutterIconColor || blue;
            }

            //apply icon color if provided, otherwise fix the path
            decoOptions.gutterIconPath = decoOptions.gutterIconColor ? this._getBookmarkDataUri(decoOptions.gutterIconColor) : this.context.asAbsolutePath(decoOptions.gutterIconPath);

            //overview
            if (decoOptions.overviewRulerColor) {
                decoOptions.overviewRulerLane = vscode.OverviewRulerLane.Full;
            }
            //background color
            if (decoOptions.backgroundColor) {
                decoOptions.isWholeLine = true;
            }
            styles[decoId] = this._getDecorationStyle(decoOptions);
        }

        return styles;
    }

    _isWorkspaceAvailable() {
        //single or multi root
        return vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length >= 1;
    }

    resetWorkspace() {
        if (!this._isWorkspaceAvailable()) return; //cannot save
        this.context.workspaceState.update("bookmarks.object", "{}");
    }

    async saveToWorkspace() {
        if (!this._isWorkspaceAvailable()) return; //cannot save
        this.context.workspaceState.update("bookmarks.object", JSON.stringify(this.bookmarks));
        let workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;
        if (workspaceFolder) {
            fs.writeFile(workspaceFolder + '/.vscode/bookmarks.json', JSON.stringify(this.bookmarks), (err) => {
                if (err) {
                    console.error(err);
                    return;
                };
            });
            //temporary spot for this
            function transformBookmarks(bookmarks) {
                let transformedData = {}

                for (const [filePath, tags] of Object.entries(bookmarks)) {
                    let fileData = []
                    for (const [tag, entries] of Object.entries(tags)) {
                        for (const entry of entries) {
                            let tagTextSplit = entry.text.split(' ', 1)
                            fileData.push({
                                line: entry.range.c.line,
                                startCharacter: entry.range.c.character,
                                endCharacter: entry.range.e.character,
                                tag: tagTextSplit[0].trim(),
                                tagText: tagTextSplit.length > 1 ? tagTextSplit[1].substring(0, 50) : ''
                            })
                        }
                    }

                    fileData.sort((a, b) => a.line - b.line || a.startCharacter - b.startCharacter)
                    transformedData[filePath] = fileData
                }

                return transformedData
            }

            async function processTags(inputJson) {
                let output = []
                for (const filePath of Object.keys(inputJson)) {
                    const sortedTags = inputJson[filePath]
                    try {
                        const file = await vscode.workspace.openTextDocument(vscode.Uri.parse(filePath))
                        let fileContents = file.getText()
                        let firstTag = sortedTags[0]
                        firstTag.tagStart = fileContents.indexOf(firstTag.tag)
                        firstTag.tagLineStart = firstTag.tagStart - firstTag.startCharacter

                        for (let i = 0; i < sortedTags.length; i++) {
                            const tag = sortedTags[i]
                            let tagEnd

                            if (i + 1 < sortedTags.length) {
                                const nextTag = sortedTags[i + 1]
                                nextTag.tagStart = fileContents.indexOf(nextTag.tag, tag.tagStart + tag.tag.length)

                                if (nextTag.startCharacter !== 0 && tag.line !== nextTag.line) {
                                    nextTag.tagLineStart = nextTag.tagStart - nextTag.startCharacter
                                } else {
                                    nextTag.tagLineStart = nextTag.tagStart
                                }
                                tagEnd = nextTag.tagLineStart
                            } else {
                                tagEnd = fileContents.length
                            }
                            let textBeforeTag = fileContents.substring(tag.tagLineStart, tag.tagStart)
                            let textAfterTag = fileContents.substring(tag.tagStart + tag.tag.length + 1, tagEnd)
                            if (tag.tag.indexOf('@summarize(') == 0) {
                                textAfterTag = fileContents.substring(tag.tagStart, tagEnd) + '@end-summarize\n'
                            }

                            if (textAfterTag !== '' && tag.tag !== '@out') {
                                output.push(textBeforeTag + textAfterTag)
                            }
                        }
                    } catch (error) {
                        console.error(error)
                    }
                }
                return output
            }
            let output = await processTags(transformBookmarks(this.bookmarks));
            fs.writeFile(workspaceFolder + '/.vscode/instructions.md', output.join(''), (err) => {
                if (err) {
                    console.error(err);
                    return;
                };
            });
        }
    }

    loadFromWorkspace() {
        if (!this._isWorkspaceAvailable()) return; //cannot load
        this.bookmarks = JSON.parse(this.context.workspaceState.get("bookmarks.object", "{}"));

        //remove all non existing files
        Object.keys(this.bookmarks).forEach(filepath => {
            const fsPath = vscode.Uri.parse(filepath).fsPath;
            if (!fs.existsSync(fsPath) || minimatch(fsPath, this.excludePattern)) {
                delete this.bookmarks[filepath];
                return;
            }

            Object.keys(this.bookmarks[filepath]).forEach(cat => {
                //for each category
                this.bookmarks[filepath][cat] = this.bookmarks[filepath][cat].map(decoObject => {
                    //fix - rebuild range object (it is expected by other functions)
                    decoObject.range = new vscode.Range(decoObject.range[0].line, decoObject.range[0].character, decoObject.range[1].line, decoObject.range[1].character);
                    return decoObject;
                });
            });
        });
    }
}

const NodeType = {
    FILE: 1,
    LOCATION: 2
};


class instructionsDataModel {

    /** treedata model */

    constructor(controller) {
        this.controller = controller;
    }

    getRoot() {  /** returns element */
        let fileBookmarks = Object.keys(this.controller.bookmarks);

        if (settings.extensionConfig().view.showVisibleFilesOnly) {

            let visibleEditorUris;
            if (settings.extensionConfig().view.showVisibleFilesOnlyMode === "onlyActiveEditor") {
                visibleEditorUris = [vscode.window.activeTextEditor.document.uri.path];
            } else {
                visibleEditorUris = vscode.window.visibleTextEditors.map(te => te.document.uri.path);
            }

            fileBookmarks = fileBookmarks.filter(v => visibleEditorUris.includes(vscode.Uri.parse(v).path));
        }

        return fileBookmarks.sort().map(v => {
            return {
                resource: vscode.Uri.parse(v),
                tooltip: v,
                name: v,
                type: NodeType.FILE,
                parent: null,
                iconPath: vscode.ThemeIcon.File,
                location: null
            };
        });
    }

    getChildren(element) {
        switch (element.type) {
            case NodeType.FILE:
                let bookmarks = Object.keys(this.controller.bookmarks[element.name]).map(cat => {
                    //all categories
                    return this.controller.bookmarks[element.name][cat].map(v => {
                        let location = new vscode.Location(element.resource, v.range);
                        return {
                            resource: element.resource,
                            location: location,
                            label: v.text.trim(),
                            name: v.text.trim(),
                            type: NodeType.LOCATION,
                            category: cat,
                            parent: element,
                            iconPath: this.controller.styles[cat].options.gutterIconPath
                        };
                    });
                }).flat(1);

                return bookmarks.sort((a, b) => a.location.range.start.line - b.location.range.start.line);
                break;
        }
    }

    /**
    Find previous and next of element (for goto_next, goto_previous)

    requires current element from tree
    */
    getNeighbors(element) {
        let ret = { previous: null, next: null };
        let parent = element.parent;
        if (!parent) {
            //fake the parent
            parent = { ...element };  //use parent or derive it from bookmark
            parent.type = NodeType.FILE;
            parent.name = element.resource;
        }

        //get all children
        let bookmarks = this.getChildren(parent);

        //lets track if we're at our element.
        let gotElement = false;

        for (let b of bookmarks) {
            // find element in list, note prevs, next
            if (!gotElement && JSON.stringify(b.location) == JSON.stringify(element.location)) {
                gotElement = true;
                continue;
            }
            if (!gotElement) {
                ret.previous = b;
            } else {
                ret.next = b;
                break;
            }
        }

        return ret;
    }

}

class InlineBookmarkTreeDataProvider {

    constructor(instructionsController) {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;

        this.controller = instructionsController;
        this.model = new instructionsDataModel(instructionsController);

        this.filterTreeViewWords = [];
        this.gitIgnoreHandler = undefined;
    }

    /** events */

    /** methods */

    getChildren(element) {
        return this._filterTreeView(element ? this.model.getChildren(element) : this.model.getRoot());
    }

    getParent(element) {
        return element ? element.parent : element;
    }

    getTreeItem(element) {
        if (!element) {
            return element; // undef
        }
        let item = new vscode.TreeItem(
            this._formatLabel(element.label),
            element.type == NodeType.LOCATION ? 0 : settings.extensionConfig().view.expanded ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed
        );
        item.id = element.type == NodeType.LOCATION ? this._getId(element.location) : this._getId(element.resource);
        item.resourceUri = element.resource;
        item.iconPath = element.iconPath;
        item.command = element.type == NodeType.LOCATION && element.location ? {
            command: 'instructions.jumpToRange',
            arguments: [element.location.uri, element.location.range],
            title: 'JumpTo'
        } : 0;
        return item;
    }

    /* 
    Hash object to unique ID.
    */
    _getId(o) {
        return crypto.createHash('sha1').update(JSON.stringify(o)).digest('hex');
    }

    _formatLabel(label) {
        if (!settings.extensionConfig().view.words.hide || !label) {
            return label;
        }
        let words = Object.values(this.controller.words).flat(1);
        return words.reduce((prevs, word) => prevs.replace(new RegExp(word, "g"), ""), label);  //replace tags in matches.
    }

    _filterTreeView(elements) {

        if (this.gitIgnoreHandler && this.gitIgnoreHandler.filter) {
            elements = elements.filter(e => this.gitIgnoreHandler.filter(e.resource));
        }

        if (this.filterTreeViewWords && this.filterTreeViewWords.length) {
            elements = elements.filter(e => this.filterTreeViewWords.some(rx => new RegExp(rx, 'g').test(e.label)));
        }

        return elements;
    }
    /** other methods */

    setTreeViewFilterWords(words) {
        this.filterTreeViewWords = words;
    }

    setTreeViewGitIgnoreHandler(gi) {
        this.gitIgnoreHandler = gi;
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }
}


module.exports = {
    instructionsCtrl: instructionsCtrl,
    InlineBookmarkTreeDataProvider: InlineBookmarkTreeDataProvider,
    NodeType: NodeType
};
