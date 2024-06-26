# Notes

This is a fork of the inline-bookmarks extension by [tintinweb](https://github.com/tintinweb)

This extension is meant to be installed with it's sister extension "Instruction Chat" by the same auther which turns these bookmarks into instructions for chatGPT.

# Instructions

<img width="350" alt="inline_bookmarks_icon" src="https://user-images.githubusercontent.com/2865694/69679883-91366500-10a9-11ea-8e36-ba3e799127b3.png">


* Specify words inside your documents that are highlighted as bookmarks in the IDE. 
* Easily navigate to bookmarks from the **Instructions** added to the Explorer Panel. 
* add bookmarks to your documents that will define the next section of text (until the next bookmark) to be used by the Instruction Chat sister extension to generate instructions for chatGPT.

Some bookmarks are already defined in settings for writting stories.  For example, if @plot appears in your file, the following text (until the next bookmark or the end of the file) will be "included" in the instructions for chatGPT.   The particular bookmark is not important (and is not in itself included in the instructions) but the text that follows it is.

The purpose of the various bookmarks is for YOU to use and make sense of the large text you may want to manage.  

The @out bookmark will exclude the following text (until the next bookmark) of the instructions.

The @out-file will skip the entire balance of the file from the instructions.

The @summarize() bookmark is special.  It has to contain a keyword in parentheses.  This keyword will be used by the post processor to summarize the text that follows the @summarize bookmark. Addtionally, you can add a ratio in the parentheses to control the length of the summary.  For example, @summarize(mystuff, 1/5) will generate a summary of 1/5 the length of the text that follows the @summarize bookmark.  The default is 1/10.


All bookmarks can be customized in settings. An **Instructions** View in the Explorer Panel helps you keep track of all your bookmarks. Navigating to the bookmark location is as easy as clicking on an item in the view.

**TO START THE EXTENSION THE FIRST TIME IN A WORKSPACE, CLICK ON THE "Instructions" ICON IN THE ACTIVITY BAR.**

## FAQ

#### Q: Where do I find more settings?

Go to `code → preferences → Extensions: Instructions`.

#### Q: How can I reset the extensions bookmark cache in case of permanent errors?

Bookmarks are cached in the vscode workspace. In case of permanent "ghost entries" or other errors you might want to try to execute the command: `inlineBookmarks.debug.state.reset`. This is going to reset the cache and allow the extension to populate it from scratch. Bookmarks are typically added as you go when opening new files in the editor. You can also make the extension scan the workspace for files containing Bookmarks. We don't do this automatically as it is quite resource intensive.

#### Q: How can I control which paths/file-extensions are being processed by the extension?

By default all paths are included (`inline-bookmarks.search.includes`) except the ones defined with `inline-bookmarks.search.excludes` (supports wildcard path globs).

Additionally, file-extensions configured with `inline-bookmarks.exceptions.file.extensions.ignore` will be excluded as well (prefer this over `search.excludes`). 

#### Q: How do I temporarily exempt certain trigger-words from being decorated?

See `inline-bookmarks.exceptions.words.ignore` (matches the beginning of the word).

#### Q: How can I define custom bookmark trigger-words/labels and colors?

The extension will search for all the default trigger-words configured with the extension. Note that these default trigger-words can be overriden (or removed). In addition, we give you complete freedom over any custom trigger-words you would want to configure. See example.

**Note**

* Existing words and styles can be overriden.
* `gutterIconColor` may be used to specify a custom icon color using any RGBA format. gutterIconColor will override gutterIconPath. See example below.
* (Deprecated) `gutterIconPath` may refer to only the four images provided with the extension right now: `images/bookmark-{red,green,blue,purple}.svg`. See example below. 
* You can assign multiple regex trigger words to a decoration style. See example.

**Example word mapping:** (accepts regular expressions; `\` needs to be encoded as `\\`)

```json
"inline-bookmarks.expert.custom.words.mapping": {
    "blue": ["@audit\\-info[ \\t\\n]"],
    "purple": ["@audit\\-issue[ \t\\n]"],
    "green": ["@audit\\-ok[ \\t\\n]"],
    "red": ["@audit[ \\t\\n]"],
    "warn": ["@warn[ \\t\\n]"] 
}
```

**Example style definition:** (all [vscode style properties](https://code.visualstudio.com/api/references/vscode-api#DecorationRenderOptions) are allowed)

```json
"inline-bookmarks.expert.custom.styles": {
    "default": {
        "gutterIconColor": "#157EFB",
        "overviewRulerColor": "rgba(21, 126, 251, 0.7)",
        "light": {
            "fontWeight": "bold"
        },
        "dark": {
            "color": "Chocolate"
        }
    },
    "red": {
        "gutterIconColor": "#F44336",
        "light": {
            "fontWeight": "bold"
        },
        "dark": {
            "color": "Chocolate"
        }
    },
    "blue": {
        "gutterIconColor": "#157EFB",
        "light": {
            "fontWeight": "bold"
        },
        "dark": {
            "color": "Chocolate"
        }
    },
    "green": {
        "gutterIconColor": "#2FCE7C",
        "light": {
            "fontWeight": "bold"
        },
        "dark": {
            "color": "Chocolate"
        }
    },
    "purple": {
        "gutterIconColor": "#C679E0",
        "light": {
            "fontWeight": "bold"
        },
        "dark": {
            "color": "Chocolate"
        }
    },
    "warn": {   // example custom style with yellow color
        "gutterIconColor": "#F4F400",
        "overviewRulerColor": "#F4F400B0",
        "light": {
            "fontWeight": "bold"
        },
        "dark": {
            "color": "Chocolate"
        }
    }
}
```

#### Q: How can I bind keys to `jumpToNext` and `jumpToPrevs` bookmark?

See https://code.visualstudio.com/docs/getstarted/keybindings.

#### Q: How can I change the bookmark-view's follow mode?

`inline-bookmarks.view.followMode` allows you to specify if you want to select the `nearest` bookmark relative to the current editor selection (default) or the next one (`chapter` mode).

#### Q: How can I make the bookmark-view's `jumpToNext` and `jumpToPrevs` behavior use the current selected line instead of the last selected bookmark?

`inline-bookmarks.view.lineMode` can be configured to `current-line`. Also see #40.

#### Q: How can I scan the workspace for bookmarks?

For performance reasons we do not automatically scan the complete workspace for bookmarks. They are instead added whenever a bookmark is encountered in a file opened in the editor. Bookmarks are then cached in the workspace and revalidated when a file is opened in the editor. In order to allow you to scan the complete workspace for bookmarks we have added a command `inlineBookmarks.scanWorkspace` that is also exposed as a button in the bookmark-view. Note that this will temporarily load files matching the search path into the editor to check for bookmarks which may demand some resources. 


 
## Release Notes

# Change Log
## 1.0.0
- time to move on to 1.0.0.  Added creation of .vscode on the fly if needed.  Updated readme to prepare for a public launch.

## 0.2.5
- added out-file to skipp entire file balance from the instructoions.md file

## 0.2.4
- adde brown, sky and lime colors

## 0.2.2
- now reset also delete the .vscode/instructions.md file and the .vscode/bookmarks.json file

## 0.2.1
- added the @summarize(parameters) bookmark that also adds a @end-summarize bookmark to the end of the section.  This can be used by a post processor to get a summary from chatGPT.

## 0.2.0
- changed the name to 'instructions'
- updated to 0.2.0 because much added functionality
- fix: was decorating files and adding to boomkmaks even if the file was in the exculded group
- new: added a dump of the resulting instructions in .vscode/instrucitons.md

## 0.1.1
- change of name to reflect the fork from the original project
- added a json dump of the bookmarks to .vscode/bookmarks.json

## 0.1.0
- fix: VSCode 1.72.0 introduced an incompatibility raising the error: 'Extension tintinweb.vscode-inline-bookmarks has provided an invalid tree item.' - #56 #57
- new: Optionally, hide items from the bookmarks view that are excluded by a downstream `.gitignore` file (requires reload)
  - option: `inline-bookmarks.view.exclude.gitIgnore` default: `false`

<img width="541" alt="image" src="https://user-images.githubusercontent.com/2865694/194845897-2146a70f-ac11-4ba9-8406-a1b582e9bf3c.png">



## 0.0.27
- fix: Command 'Select Bookmark' results in error 'filter is not a function' - #50 #51
- update: License 👉 [GPLv3](LICENSE)

## 0.0.26
- new: config setting: `inline-bookmarks.view.showVisibleFilesOnlyMode =  "allVisibleEditors" || "onlyActiveEditor"` to control the Inline Bookmarks View's "show visible editors only" behavior - #49
  - `allVisibleEditors` - default behavior. with "show visible editors only" and `allVisibleEditors` mode bookmarks for all visible editors are shown in the Inline Bookmarks View
  - `onlyActiveEditor` - with "show visible editors only" and `allVisibleEditors` mode only bookmarks for the currently selected/active editor are shown in the Inline Bookmarks View

- fix: default bookmark/tag regex to include all whitespaces (including CRLF). - #48


## 0.0.25
- fix: list bookmarks not working correctly - #43

## 0.0.24
- new: support for custom bookmarks colors. More information see [Readme.md/FAQ/Custom Styles and Mapping](./README.md#FAQ) Settings - see #30, #42 (thanks @rkodey)
- new: `inline-bookmarks.view.lineMode` allows to specify the behavior when jumping to the next/previous bookmark. Either use the current `selected-bookmark` or the `current-line` selected in the editor as the reference for the next jump. - see #40, #41 (thanks @rkodey)
- fixed: jump errors due to vscode api misuse - see #38, #39 (thanks @rkodey)

## 0.0.23
- new: Color indicators for the overview ruler `overviewRulerColor` for all tags - #35

## 0.0.22
- new: command `List Visible Bookmarks` prints bookmarks for currently visible editors (use `List Bookmarks` if you want to print all bookmarks)
- new: command `Select Visible Bookmark` that allows to quickly jump to bookmarks in currently visible editors (use `Select Bookmark` if you want to select from an unfiltered list)

## 0.0.21
- fixed: an update to vscode caused the list-view selection tracking to fail with "cannot read property '_uri'  of undefined" - see #33 

## 0.0.20
- new: new quick actions to bookmarks view - #20
  - Jump to Previous/Next, Filter View, Scan Workspace for Bookmarks (slow)
  - renamed "Set View Filter" to "Filter View ..."
  - updated "Filter View ..." prompt with a note that an empty filter disables filtering
  
Buttons (left to right):
- Jump to previous bookmark.
- Jump to next bookmark.
- Filter bookmark view: the prompt accepts regular expressions. keep empty to disable filtering.
- Toggle: show bookmark for visible editors only.
- Quick Refresh: refreshes the bookmark from the internal cache.
- Scan Workspace for Bookmarks: scans all documents in the workspace for bookmark tags

 ![image](https://user-images.githubusercontent.com/2865694/103533925-44b57f80-4e8e-11eb-8602-8fda358c8961.png)

 

## 0.0.19
- new: command to list all bookmarks (text)
- new: experimental command to scan workspace for bookmarks
  - note: don't use this on large workspaces. if it breaks use the `onCommand:inlineBookmarks.debug.state.reset` command from the command palette
- fixed: listview filter not working correctly - #24

## 0.0.18
- fixed: extension not fully registered if vscode is slow or editor not set
  - may manifest as cross-extension incompatibility as reported with #17

## 0.0.17
- new: added functionality to quickly filter the list of bookmarks `inlineBookmarks.showSelectBookmark` #11
- fixed: multiple issues where tree items or bookmarks where undefined #16
- new: debug command to reset the stored bookmarks read from workspace. in case the workspace is corrupt. `inlineBookmarks.debug.state.reset` #16

## 0.0.16
- new: added commands to jump to next/previous bookmark: `inlineBookmarks.jumpToNext` `inlineBookmarks.jumpToPrevious` #12
  - **Note**: keyboard shortcuts can be configured in `code -> preferences -> keyboard shortcuts` #15
- new: added functionality to filter the bookmark view #14
- fixed: remove `jumpToLine` from command menu #13

## 0.0.15
- fixed: treeview item id(0) error
- new: set `inline-bookmarks.view.words.hide` to hide tags/trigger words in bookmarks view (only for entries with additional text)

## 0.0.14
- fixed: wrong treeview item selected #7

## 0.0.13
- allow to specify bookmarks view follow behavior: `inline-bookmarks.view.followMode`
  - `nearest` - highlights the nearest bookmark (relative distance)
  - `chapter` - highlights the most recent bookmark or the bookmark that is on the current line.

## 0.0.12

- new: sync the bookmarks view with the editor click action (highlight nearest)
- fixed: sort bookmarks view by line number

## 0.0.11

- fixed: icon not shown in bookmark view on Windows
- fixed: bookmark view does not refresh on Windows

## 0.0.10

- fixed: errors due to assignment to const
- added: dark theme icons
- fixed: make clear that the refresh button only reloads known bookmarks and does not scan all files in the workspace

## 0.0.9

- changed: when set, show all visible editor files bookmarks in bookmarks view
- new: allow to define bookmark view behavior as initially collapsed (default) or expanded. 
  - Code -> Preferences -> Settings `inline-bookmarks.view.expanded`
  - Or, run command: `Toggle: Keep File View expanded` (`inlineBookmarks.toggleViewKeepFilesExpanded`)

## 0.0.8
- new: toggle Inline Bookmark view to only show bookmarks of active file vs. all files
  - by default shows all files

## 0.0.7
- new: configuration options
  - disable decorations
  - blacklist files-extensions that should not be decorated
  - blacklist words that should be temporarily ignored from decoration
  - hard-code default styles but allow to override them in the configuration
  - expose trigger words for default styles and allow to customize them
  - allow users to configure new styles and map trigger words to them
- fix: bookmarks view: did not auto-refresh on load
- fix: pattern for audit-issue
- fix: clear empty bookmarks

## 0.0.6
- fix: "rejected promise not handled ..."

## 0.0.4 - 0.0.5
- fix: bookmarks view: files are not removed when all bookmarks are deleted

## 0.0.3
- bookmarks view: sort list of files
- bookmarks view: added refresh button to refresh tracked files
- fix: output window shows up in bookmarks view

## 0.0.1 - 0.0.2
- Initial release
- customizable inline bookmarks
- code decorations (highlights the bookmark tags, gutter icon)
- Inline Bookmarks View


-----------------------------------------------------------------------------------------------------------
