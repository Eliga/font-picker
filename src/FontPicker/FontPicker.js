import throttle from 'lodash.throttle';
import FontManager from '../FontManager/FontManager';
import './style/style.scss';

const THROTTLE_INTERVAL = 250;

/**
 * User interface for the font picker
 * @see FontManager parameters
 */
export default class FontPicker {
	constructor(apiKey, defaultFont, options, onChange) {
		// Function bindings
		this.closeEventListener = this.closeEventListener.bind(this);

		// Determine font picker ID and selector suffix from its name
		if (options.name) {
			this.pickerSuffix = `-${options.name}`;
		} else {
			this.pickerSuffix = '';
		}
		this.pickerId = `font-picker${this.pickerSuffix}`;

		// Initialize FontManager and FontPicker UI
		this.fontManager = new FontManager(apiKey, defaultFont, options, onChange);
		this.generateUI();
	}

	/**
	 * Download list of available fonts and generate the font picker UI
	 */
	generateUI() {
		this.expanded = false;

		const fontPickerDiv = document.getElementById(this.pickerId);
		if (!fontPickerDiv) {
			throw Error(`Missing div with id="${this.pickerId}"`);
		}

		// HTML for dropdown button (name of active font and dropdown arrow)
		this.dropdownButton = document.createElement('button');
		this.dropdownButton.classList.add('dropdown-button');
		this.dropdownButton.onclick = () => this.toggleExpanded();
		this.dropdownButton.onkeypress = () => this.toggleExpanded();
		this.dropdownButton.type = 'button';
		fontPickerDiv.appendChild(this.dropdownButton);
		// Name of selected font
		this.dropdownFont = document.createElement('p');
		this.dropdownFont.innerHTML = this.fontManager.activeFont.family;
		this.dropdownFont.classList.add('dropdown-font-name');
		this.dropdownButton.appendChild(this.dropdownFont);
		// Dropdown icon (possible classes/states: 'loading', 'finished', 'error')
		const dropdownIcon = document.createElement('p');
		dropdownIcon.classList.add('dropdown-icon', 'loading');
		this.dropdownButton.appendChild(dropdownIcon);

		// HTML for font list
		this.ul = document.createElement('ul');

		// Fetch font list, display dropdown arrow if successful
		this.fontManager
			.init()
			.then(() => {
				dropdownIcon.classList.remove('loading');
				dropdownIcon.classList.add('finished');

				// HTML for font list entries
				this.ul.onscroll = throttle(() => this.onScroll(), THROTTLE_INTERVAL); // download font previews on scroll
				for (let i = 0; i < this.fontManager.fonts.length; i += 1) {
					const fontFamily = this.fontManager.fonts[i].family;
					const fontId = fontFamily.replace(/\s+/g, '-').toLowerCase();

					// Write font name in the corresponding font, set onclick listener
					const li = document.createElement('li');
					const fontButton = document.createElement('button');
					fontButton.type = 'button';
					fontButton.innerHTML = fontFamily;
					fontButton.classList.add(`font-${fontId}${this.pickerSuffix}`);
					fontButton.onclick = () => {
						this.toggleExpanded(); // collapse font list
						this.setActiveFont(this.fontManager.fonts[i].family);
					};
					fontButton.onkeypress = () => {
						this.toggleExpanded(); // collapse font list
						this.setActiveFont(this.fontManager.fonts[i].family);
					};
					li.appendChild(fontButton);

					// If active font: highlight it and save reference
					if (this.fontManager.fonts[i].family === this.fontManager.activeFont.family) {
						fontButton.classList.add('active-font');
						this.activeFontA = fontButton;
					}

					this.ul.appendChild(li);
				}
				fontPickerDiv.appendChild(this.ul);
			})
			.catch(err => {
				dropdownIcon.classList.remove('loading');
				dropdownIcon.classList.add('error');
				const errMessage = 'Error trying to fetch the list of available fonts';
				console.error(errMessage);
				console.error(err);
				fontPickerDiv.title = errMessage;
			});
	}

	/**
	 * EventListener for closing the font picker when clicking anywhere outside it
	 */
	closeEventListener(e) {
		let targetElement = e.target; // clicked element

		do {
			if (targetElement === document.getElementById(this.pickerId)) {
				// Click inside font picker
				return;
			}
			// Move up the DOM
			targetElement = targetElement.parentNode;
		} while (targetElement);

		// Click outside font picker
		this.toggleExpanded();
	}

	/**
	 * Return the object of the currently selected font
	 */
	getActiveFont() {
		return this.fontManager.activeFont;
	}

	/**
	 * Download the font previews for all visible font entries and the five after them
	 */
	onScroll() {
		const elementHeight = this.ul.scrollHeight / this.fontManager.fonts.length;
		const downloadIndex = Math.ceil((this.ul.scrollTop + this.ul.clientHeight) / elementHeight);
		this.fontManager.downloadPreviews(downloadIndex + 5);
	}

	/**
	 * Set the font with the given font list index as the active one and highlight it in the list
	 */
	setActiveFont(fontFamily) {
		const listIndex = this.fontManager.setActiveFont(fontFamily);
		if (listIndex >= 0) {
			// On success: Write new font name in dropdown button and highlight it in the font list
			this.dropdownFont.innerHTML = fontFamily;
			this.activeFontA.classList.remove('active-font');
			this.activeFontA = this.ul.getElementsByTagName('li')[listIndex].firstChild;
			this.activeFontA.classList.add('active-font');
		}
	}

	/**
	 * Expand/collapse the picker's font list
	 */
	toggleExpanded() {
		if (this.expanded) {
			this.expanded = false;
			this.dropdownButton.classList.remove('expanded');
			this.ul.classList.remove('expanded');
			document.removeEventListener('click', this.closeEventListener);
		} else {
			this.expanded = true;
			this.dropdownButton.classList.add('expanded');
			this.ul.classList.add('expanded');
			document.addEventListener('click', this.closeEventListener);
		}
	}
}
