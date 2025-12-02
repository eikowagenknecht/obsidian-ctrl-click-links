import { Platform, Plugin, WorkspaceLeaf } from "obsidian";

export default class CtrlClickLinksPlugin extends Plugin {
	private static readonly MARKDOWN_VIEW = "markdown";
	private static readonly EDITOR_SELECTOR = ".cm-content";
	private static readonly LINK_CLASSES = ["cm-hmd-internal-link", "cm-link", "cm-url"];

	#registeredLeafs = new Set<WorkspaceLeaf>();
	#isMac = Platform.isMacOS;

	override onload() {
		this.app.workspace.on("file-open", () => {
			this.#recheckAllLeafs();
		});
		this.#recheckAllLeafs();
	}

	override onunload() {
		this.#registeredLeafs.forEach((v) => {
			const editorEl = v.view.containerEl.querySelector(CtrlClickLinksPlugin.EDITOR_SELECTOR);
			if (editorEl) {
				this.#removeListenerFromElement(editorEl);
			}
		});
	}

	#recheckAllLeafs() {
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (
				leaf.view.getViewType() === CtrlClickLinksPlugin.MARKDOWN_VIEW &&
				!this.#registeredLeafs.has(leaf)
			) {
				this.#registeredLeafs.add(leaf);
				const editorEl =
					leaf.view.containerEl.querySelector(CtrlClickLinksPlugin.EDITOR_SELECTOR);
				// In some cases, this will be null.
				// —— I couldn't reproduce this issue in my environment, Let's leave it at that for now.
				if (!editorEl) return;

				this.#addListenerToElement(editorEl);

				const originalUnload = leaf.view.onunload.bind(leaf.view);
				leaf.view.onunload = () => {
					this.#registeredLeafs.delete(leaf);
					this.#removeListenerFromElement(editorEl);
					originalUnload();
					leaf.view.onunload = originalUnload;
				};
			}
		});
	}

	#clickEventHandler = (event: MouseEvent) => {
		const target = event.target as HTMLElement;

		if (!this.#isLinkElement(target)) {
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

	#isLinkElement(target: HTMLElement): boolean {
		return target.tagName === "A" ||
			CtrlClickLinksPlugin.LINK_CLASSES.some(cls => target.classList.contains(cls));
	}

	#isExternalLink(target: HTMLElement): boolean {
		// Check if it's an actual anchor element with href (and not just href="#")
		if (target instanceof HTMLAnchorElement && target.href && target.href !== window.location.href + '#') {
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

	#addListenerToElement(element: Element) {
		element.addEventListener("click", this.#clickEventHandler, {
			capture: true,
		});
	}

	#removeListenerFromElement(element: Element) {
		element.removeEventListener("click", this.#clickEventHandler, {
			capture: true,
		});
	}

	#preventEvent(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
	}
}
