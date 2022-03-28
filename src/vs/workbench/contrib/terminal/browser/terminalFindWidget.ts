/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { SimpleFindWidget } from 'vs/workbench/contrib/codeEditor/browser/find/simpleFindWidget';
import { IContextViewService } from 'vs/platform/contextview/browser/contextView';
import { IContextKeyService, IContextKey } from 'vs/platform/contextkey/common/contextkey';
import { FindReplaceState } from 'vs/editor/contrib/find/browser/findState';
import { ITerminalService, IXtermTerminal } from 'vs/workbench/contrib/terminal/browser/terminal';
import { TerminalContextKeys } from 'vs/workbench/contrib/terminal/common/terminalContextKey';

export class TerminalFindWidget extends SimpleFindWidget {
	protected _findInputFocused: IContextKey<boolean>;
	protected _findWidgetFocused: IContextKey<boolean>;
	private _findWidgetVisible: IContextKey<boolean>;
	private _matchesCount: HTMLElement | undefined;

	constructor(
		findState: FindReplaceState,
		@IContextViewService _contextViewService: IContextViewService,
		@IContextKeyService private readonly _contextKeyService: IContextKeyService,
		@ITerminalService private readonly _terminalService: ITerminalService
	) {
		super(_contextViewService, _contextKeyService, findState, true);
		this._register(findState.onFindReplaceStateChange(() => {
			this.show();
		}));
		super.getDomNode().classList.add('terminal-find');
		this._findInputFocused = TerminalContextKeys.findInputFocus.bindTo(this._contextKeyService);
		this._findWidgetFocused = TerminalContextKeys.findFocus.bindTo(this._contextKeyService);
		this._findWidgetVisible = TerminalContextKeys.findVisible.bindTo(_contextKeyService);
	}

	find(previous: boolean) {
		const instance = this._terminalService.activeInstance;
		if (!instance) {
			return;
		}
		if (previous) {
			instance.xterm?.findPrevious(this.inputValue, { regex: this._getRegexValue(), wholeWord: this._getWholeWordValue(), caseSensitive: this._getCaseSensitiveValue() });
		} else {
			instance.xterm?.findNext(this.inputValue, { regex: this._getRegexValue(), wholeWord: this._getWholeWordValue(), caseSensitive: this._getCaseSensitiveValue() });
		}
	}

	override reveal(initialInput?: string): void {
		const instance = this._terminalService.activeInstance;
		if (instance && this.inputValue && this.inputValue !== '') {
			// trigger highlight all matches
			instance.xterm?.findPrevious(this.inputValue, { incremental: true, regex: this._getRegexValue(), wholeWord: this._getWholeWordValue(), caseSensitive: this._getCaseSensitiveValue() }).then(foundMatch => {
				this.updateButtons(foundMatch);
			});
		}
		this.updateButtons(false);

		super.reveal(initialInput);
		this._findWidgetVisible.set(true);
	}

	override show(initialInput?: string) {
		super.show(initialInput);
		this._findWidgetVisible.set(true);
	}

	override hide() {
		super.hide();
		this._findWidgetVisible.reset();
		const instance = this._terminalService.activeInstance;
		if (instance) {
			instance.focus();
		}
		instance?.xterm?.clearSearchDecorations();
	}

	protected _onInputChanged() {
		// Ignore input changes for now
		const instance = this._terminalService.activeInstance;
		if (instance?.xterm) {
			instance.xterm.findPrevious(this.inputValue, { regex: this._getRegexValue(), wholeWord: this._getWholeWordValue(), caseSensitive: this._getCaseSensitiveValue(), incremental: true }).then(foundMatch => {
				this.updateButtons(foundMatch);
				this._updateMatchesCount(instance.xterm!);
			});
		}
		return false;
	}
	private _updateMatchesCount(xterm: IXtermTerminal) {
		if (!this._matchesCount) {
			this._matchesCount = document.createElement('div');
		}
		this._matchesCount.className = 'matchesCount';
		this._matchesCount.innerText = '';
		const count = xterm.getMatchesCount();
		const matches = count > 0 ? `${count} Results` : `No Results`;
		this._matchesCount.appendChild(document.createTextNode(matches));
		const node = super.getDomNode().querySelector('.monaco-findInput');
		if (count === 0) {
			this._matchesCount.style.color = '#F48771';
		} else {
			this._matchesCount.style.color = 'inherit';
		}
		this._matchesCount.style.paddingLeft = '3px';
		node?.insertAdjacentElement('afterend', this._matchesCount);
	}

	protected _onFocusTrackerFocus() {
		const instance = this._terminalService.activeInstance;
		if (instance) {
			instance.notifyFindWidgetFocusChanged(true);
		}
		this._findWidgetFocused.set(true);
	}

	protected _onFocusTrackerBlur() {
		const instance = this._terminalService.activeInstance;
		if (instance) {
			instance.notifyFindWidgetFocusChanged(false);
		}
		this._findWidgetFocused.reset();
	}

	protected _onFindInputFocusTrackerFocus() {
		this._findInputFocused.set(true);
	}

	protected _onFindInputFocusTrackerBlur() {
		this._findInputFocused.reset();
	}

	findFirst() {
		const instance = this._terminalService.activeInstance;
		if (instance) {
			if (instance.hasSelection()) {
				instance.clearSelection();
			}
			instance.xterm?.findPrevious(this.inputValue, { regex: this._getRegexValue(), wholeWord: this._getWholeWordValue(), caseSensitive: this._getCaseSensitiveValue() });
		}
	}
}
