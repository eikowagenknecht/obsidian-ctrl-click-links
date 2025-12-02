# Obsidian Ctrl+Click Links

An Obsidian plugin that restores the traditional link opening behavior, requiring <kbd>Ctrl</kbd> + <kbd>Click</kbd> (or <kbd>Cmd</kbd> + <kbd>Click</kbd> on macOS) to follow links in edit mode. This allows you to freely click and edit link text without accidentally navigating away.

## Features

This plugin provides several link opening modes using modifier keys:

- **<kbd>Ctrl/Cmd</kbd> + <kbd>Click</kbd>** - Open link in current tab
- **<kbd>Ctrl/Cmd</kbd> + <kbd>Shift</kbd> + <kbd>Click</kbd>** - Open link in new tab
- **<kbd>Ctrl/Cmd</kbd> + <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>Click</kbd>** - Open link in new window
- **<kbd>Click</kbd>** (no modifiers) - Edit the link text (default behavior)

Works with all link types:
- Internal links (`[[note]]`)
- External links (`[text](url)`)
- URLs

## Installation

1. Download `main.js` and `manifest.json` from the [latest release](https://github.com/eikowagenknecht/obsidian-ctrl-click-links/releases)
2. Create a folder named `obsidian-ctrl-click-links` in your vault's `.obsidian/plugins/` directory
3. Copy the downloaded files into this folder
4. Reload Obsidian and enable the plugin in Settings → Community Plugins

## Usage

Once enabled, the plugin automatically changes link behavior in edit mode:

- Click on links normally to position your cursor and edit the link text
- Hold <kbd>Ctrl</kbd> (or <kbd>Cmd</kbd> on macOS) while clicking to follow the link
- Use additional modifiers (<kbd>Shift</kbd>, <kbd>Alt</kbd>) for different opening modes

No configuration needed - it just works!

## Development

### Building the Plugin

```bash
# Install dependencies
npm install

# Development mode (watch for changes)
npm run dev

# Production build
npm run build
```

### Creating a Release

1. Update version in `manifest.json`
2. Run `npm run version` to update version files
3. Commit changes
4. Create and push a git tag:
   ```bash
   git tag 1.2.2
   git push --tags
   ```
5. GitHub Actions will automatically create a draft release
6. Review and publish the release on GitHub

## Attribution

This plugin is a fork of the original work by [SmallZombie](https://github.com/SmallZombie).

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for details.

Copyright 2024 SmallZombie (original work)
Copyright 2025 eikowagenknecht (modifications)
