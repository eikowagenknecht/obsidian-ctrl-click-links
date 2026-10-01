import { MarkdownView, PaneType, Platform, Plugin } from "obsidian";

export default class CtrlClickLinksPlugin extends Plugin {
	private static readonly EDITOR_SELECTOR = ".cm-content";
	// Obsidian nests the visible link text in further spans (e.g. .cm-underline),
	// so the click target is usually a descendant of the element carrying these.
	private static readonly LINK_SELECTOR = "a, .cm-hmd-internal-link, .cm-link, .cm-url";
	private static readonly EXTERNAL_LINK_TYPES = ["external-link", "external-ref-link"];

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

		// Without a modifier the click should only place the cursor, so
		// suppress Obsidian's own link handling.
		if (!modifierKeyPressed) {
			this.#preventEvent(event);
			return;
		}

		const link = this.#resolveLink(target, event);

		// For external links with modifier key, let Obsidian open them as usual
		if (link && CtrlClickLinksPlugin.EXTERNAL_LINK_TYPES.includes(link.type)) {
			return;
		}

		this.#handleInternalLinkClick(link, event);
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
		return !!target.closest(CtrlClickLinksPlugin.EDITOR_SELECTOR) &&
			!!target.closest(CtrlClickLinksPlugin.LINK_SELECTOR);
	}

	#handleInternalLinkClick(link: ResolvedLink | null, event: MouseEvent) {
		this.#preventEvent(event);

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
	#resolveLink(target: HTMLElement, event: MouseEvent): ResolvedLink | null {
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
		return { text: token.text, type: token.type, sourcePath: view.file?.path ?? "" };
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

interface ResolvedLink {
	text: string;
	type: string;
	sourcePath: string;
}
