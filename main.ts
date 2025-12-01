import { Plugin, WorkspaceLeaf } from "obsidian";

export default class LinkOpeningRestore extends Plugin {
	#registeredLeafs = new Set<WorkspaceLeaf>();
	#isMac = navigator.platform.toUpperCase().includes("MAC"); // Detect macOS platform

	override onload() {
		this.app.workspace.on("file-open", () => {
			this.#recheckAllLeafs();
		});
		this.#recheckAllLeafs();
	}

	override onunload() {
		this.#registeredLeafs.forEach((v) => {
			const editorEl = v.view.containerEl.querySelector(".cm-content")!;
			this.#removeListenerFromElement(editorEl);
		});
	}

	#recheckAllLeafs() {
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (
				leaf.view.getViewType() === "markdown" &&
				!this.#registeredLeafs.has(leaf)
			) {
				// console.log('[debug] #recheckAllLeafs new leaf', leaf);
				this.#registeredLeafs.add(leaf);
				const editorEl =
					leaf.view.containerEl.querySelector(".cm-content");
				// In some cases, this will be null.
				// —— I couldn't reproduce this issue in my environment, Let's leave it at that for now.
				if (!editorEl) return;

				this.#addListenerToElement(editorEl);

				const originalUnload = leaf.view.onunload;
				leaf.view.onunload = () => {
					// console.log('debug unload leaf', leaf);
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
		// console.log('[debug] #clickEventHandler target', target);
		if (
			target.tagName !== "A" &&
			!target.classList.contains("cm-hmd-internal-link") &&
			!target.classList.contains("cm-link") &&
			!target.classList.contains("cm-url")
		) {
			return;
		}

		// Handle macOS (Command key) and other platforms (Ctrl key)
		const modifierKeyPressed = this.#isMac ? event.metaKey : event.ctrlKey;

		// Get the link path from the target
		const linkText = decodeURIComponent(target.textContent!);
		const file = this.app.metadataCache.getFirstLinkpathDest(linkText, "");

		// Ctrl + Alt + Shift + Click: Open in new window
		if (event.altKey && event.shiftKey && modifierKeyPressed) {
			// console.log('[debug] #clickEventHandler open in new window', linkText);
			if (file) {
				this.app.workspace.openPopoutLeaf().openFile(file);
			}
			event.preventDefault();
			event.stopPropagation();
			return;
		}

		// Ctrl + Shift + Click: Open in new tab
		if (event.shiftKey && modifierKeyPressed && !event.altKey) {
			// console.log('[debug] #clickEventHandler open in new tab', linkText);
			if (file) {
				this.app.workspace.getLeaf('tab').openFile(file);
			}
			event.preventDefault();
			event.stopPropagation();
			return;
		}

		// Ctrl + Click: Open in same tab
		if (modifierKeyPressed && !event.shiftKey && !event.altKey) {
			// console.log('[debug] #clickEventHandler open in same tab', linkText);
			if (file) {
				this.app.workspace.getLeaf(false).openFile(file);
			}
			event.preventDefault();
			event.stopPropagation();
			return;
		}

		// Click without modifiers: Prevent default (allow edit mode)
		event.preventDefault();
		event.stopPropagation();
	};

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
}
