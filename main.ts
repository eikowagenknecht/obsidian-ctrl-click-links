import { Platform, Plugin } from "obsidian";

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
		const linkText = decodeURIComponent(target.textContent ?? "");
		const file = this.app.metadataCache.getFirstLinkpathDest(linkText, "");

		// Ctrl + Alt + Shift + Click: Open in new window
		if (event.altKey && event.shiftKey && modifierKeyPressed) {
			if (file) {
				this.app.workspace.openPopoutLeaf().openFile(file).catch(console.error);
			}
			this.#preventEvent(event);
			return;
		}

		// Ctrl + Shift + Click: Open in new tab
		if (event.shiftKey && modifierKeyPressed && !event.altKey) {
			if (file) {
				this.app.workspace.getLeaf('tab').openFile(file).catch(console.error);
			}
			this.#preventEvent(event);
			return;
		}

		// Ctrl + Click: Open in same tab
		if (modifierKeyPressed && !event.shiftKey && !event.altKey) {
			if (file) {
				this.app.workspace.getLeaf(false).openFile(file).catch(console.error);
			}
			this.#preventEvent(event);
			return;
		}

		// Click without modifiers: Prevent default (allow edit mode)
		this.#preventEvent(event);
	}

	#preventEvent(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
	}
}
