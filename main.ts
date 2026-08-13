import { MarkdownView, PaneType, Platform, Plugin } from "obsidian";

export default class CtrlClickLinksPlugin extends Plugin {
	private static readonly EDITOR_SELECTOR = ".cm-content";
	private static readonly LINK_CLASSES = ["cm-hmd-internal-link", "cm-link", "cm-url"];

	#isMac = Platform.isMacOS;

	override onload() {
		document.addEventListener("click", this.#clickEventHandler, true);
		document.addEventListener("mousedown", this.#mousedownEventHandler, true);
	}

	override onunload() {
		document.removeEventListener("click", this.#clickEventHandler, true);
		document.removeEventListener("mousedown", this.#mousedownEventHandler, true);
	}

	#clickEventHandler = (event: MouseEvent) => {
		const target = event.target as HTMLElement;

		if (!this.#isEditorLink(target)) {
			return;
		}

		const modifierKeyPressed = this.#isMac ? event.metaKey : event.ctrlKey;

		// For external links with modifier key, allow default browser behavior
		if (this.#isExternalLink(target) && modifierKeyPressed) {
			return;
		}

		// Handle internal link opening with various modifier combinations
		this.#handleInternalLinkClick(target, event, modifierKeyPressed);
	};

	// Links are draggable by default, which makes the caret land in the wrong
	// place on click. Disabling it lets the click position the cursor correctly.
	#mousedownEventHandler = (event: MouseEvent) => {
		const target = event.target as HTMLElement;

		if (!this.#isEditorLink(target)) {
			return;
		}

		target.draggable = false;
	};

	// Only act on links inside a CodeMirror editor, so reading view and other
	// parts of the UI keep their default behavior.
	#isEditorLink(target: HTMLElement): boolean {
		return !!target.closest(CtrlClickLinksPlugin.EDITOR_SELECTOR) && this.#isLinkElement(target);
	}

	#isLinkElement(target: HTMLElement): boolean {
		return target.tagName === "A" ||
			CtrlClickLinksPlugin.LINK_CLASSES.some(cls => target.classList.contains(cls));
	}

	#isExternalLink(target: HTMLElement): boolean {
		// Check if it's an actual anchor element with href (and not just href="#")
		if (target.instanceOf(HTMLAnchorElement) && target.href && target.href !== window.location.href + '#') {
			return true;
		}

		// Check if target or its parent has cm-url class (for plain URLs)
		if (target.classList.contains("cm-url") ||
			(target.parentElement && target.parentElement.classList.contains("cm-url"))) {
			return true;
		}

		return false;
	}

	#handleInternalLinkClick(target: HTMLElement, event: MouseEvent, modifierKeyPressed: boolean) {
		// Suppress Obsidian's own handling either way: without a modifier the
		// click should only place the cursor.
		this.#preventEvent(event);

		if (!modifierKeyPressed) {
			return;
		}

		let newLeaf: PaneType | false;
		if (event.altKey && event.shiftKey) {
			// Ctrl + Alt + Shift + Click: Open in new window
			newLeaf = "window";
		} else if (event.shiftKey && !event.altKey) {
			// Ctrl + Shift + Click: Open in new tab
			newLeaf = "tab";
		} else if (!event.shiftKey && !event.altKey) {
			// Ctrl + Click: Open in same tab
			newLeaf = false;
		} else {
			// Ctrl + Alt is not one of our shortcuts
			return;
		}

		const link = this.#resolveLink(target, event);
		if (!link) {
			return;
		}

		this.app.workspace
			.openLinkText(link.text, link.sourcePath, newLeaf)
			.catch(console.error);
	}

	// The clicked element's text is what the reader sees, which is not the link
	// target for [[note|alias]] or [display](note.md). Ask the editor for the
	// token under the pointer instead, which resolves to the real target and
	// keeps any #heading or #^block subpath attached.
	#resolveLink(target: HTMLElement, event: MouseEvent): { text: string; sourcePath: string } | null {
		const view = this.#getMarkdownViewFor(target);
		if (!view) {
			return null;
		}

		const pos = view.editor.posAtCoords(event.clientX, event.clientY);
		if (!pos) {
			return null;
		}

		const token = view.editor.getClickableTokenAt(pos);
		if (!token) {
			return null;
		}

		// Links resolve relative to the note they are written in.
		return { text: token.text, sourcePath: view.file?.path ?? "" };
	}

	// Resolve the view from the clicked element rather than from the active
	// view: the click may land in a split or popout that is not focused yet.
	#getMarkdownViewFor(target: HTMLElement): MarkdownView | null {
		let match: MarkdownView | null = null;

		this.app.workspace.iterateAllLeaves((leaf) => {
			if (match) {
				return;
			}
			const view = leaf.view;
			if (view instanceof MarkdownView && view.containerEl.contains(target)) {
				match = view;
			}
		});

		return match;
	}

	#preventEvent(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
	}
}

declare module "obsidian" {
	interface Editor {
		posAtCoords(x: number, y: number): EditorPosition | null;
		getClickableTokenAt(pos: EditorPosition): { text: string; type: string } | null;
	}
}
