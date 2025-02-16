import $ from 'jquery';

import FormDialog from 'ui/html_editor/ui/formDialog';
import { isPromise } from 'core/utils/type';
import devices from 'core/devices';
import { getCurrentScreenFactor, hasWindow } from 'core/utils/window';
import keyboardMock from '../../../helpers/keyboardMock.js';

const DIALOG_CLASS = 'dx-formdialog';
const FORM_CLASS = 'dx-formdialog-form';
const FIELD_ITEM_CLASS = 'dx-field-item';
const TEXTEDITOR_INPUT_CLASS = 'dx-texteditor-input';
const BUTTON_WITH_TEXT_CLASS = 'dx-button-has-text';

const moduleConfig = {
    beforeEach: function() {
        this.$element = $('#htmlEditor');
        this.componentMock = {
            _createComponent: ($container, Widget, options) => {
                return new Widget($container, options);
            },
            $element: () => {
                return this.$element;
            }
        };
    }
};

const { test } = QUnit;

QUnit.module('FormDialog', moduleConfig, () => {
    test('render FormDialog', function(assert) {
        const formDialog = new FormDialog(this.componentMock);
        const $dialog = this.$element.find(`.${DIALOG_CLASS}`);
        const $form = $dialog.find(`.${FORM_CLASS}`);

        assert.ok(formDialog, 'constructor return an instance');
        assert.equal($dialog.length, 1, 'There is element with the FormDialog class');
        assert.equal($form.length, 1, 'There is element with the Form class inside FormDialog');
    });

    test('render FormDialog with popup options', function(assert) {
        const formDialog = new FormDialog(this.componentMock, { width: 155 });

        assert.equal(formDialog.popupOption('width'), 155, 'Custom width should apply');
    });

    test('change FormDialog form options', function(assert) {
        const formDialog = new FormDialog(this.componentMock);

        formDialog.formOption('width', 155);

        assert.equal(formDialog.formOption('width'), 155, 'Custom width should apply');
    });

    test('show dialog', function(assert) {
        const formDialog = new FormDialog(this.componentMock, { container: this.$element });
        const promise = formDialog.show({ items: ['name', 'age'] });
        const formItemsCount = this.$element.find(`.${FORM_CLASS} .${FIELD_ITEM_CLASS}`).length;

        assert.ok(isPromise(promise), 'show returns a promise');
        assert.equal(formItemsCount, 2, '2 form items are rendered');
    });

    test('check dialog popup fullscreen mode (T1026801)', function(assert) {
        const screenFactor = hasWindow() ? getCurrentScreenFactor() : null;
        const expectedFullScreen = devices.real().deviceType === 'phone' || screenFactor === 'xs';

        const formDialog = new FormDialog(this.componentMock, { container: this.$element });
        formDialog.show({ items: ['name'] });

        assert.strictEqual(formDialog._popup.option('fullScreen'), expectedFullScreen);
    });

    test('confirm dialog by api', function(assert) {
        assert.expect(1);

        const EXPECTED_DATA = { name: 'Test', age: 20 };
        const formDialog = new FormDialog(this.componentMock, { container: this.$element });
        const promise = formDialog.show({ items: ['name', 'age'] });

        promise.done((formData) => {
            assert.deepEqual(formData, EXPECTED_DATA, 'new data is correct');
        });

        formDialog.hide(EXPECTED_DATA);
    });

    test('confirm dialog by Enter key press', function(assert) {
        assert.expect(1);

        const EXPECTED_DATA = { name: 'Test' };
        const formDialog = new FormDialog(this.componentMock, { container: this.$element });
        const promise = formDialog.show({ items: ['name'] });
        const $input = $(`.${FORM_CLASS} .${TEXTEDITOR_INPUT_CLASS}`);

        promise.done((formData) => {
            assert.deepEqual(formData, EXPECTED_DATA, 'new data is correct');
        });

        keyboardMock($input).type('Test').change().press('enter');
    });

    test('confirm dialog by button', function(assert) {
        assert.expect(1);

        const EXPECTED_DATA = { name: 'Test' };
        const formDialog = new FormDialog(this.componentMock, { container: this.$element });
        const promise = formDialog.show({ items: ['name'] });
        const $input = $(`.${FORM_CLASS} .${TEXTEDITOR_INPUT_CLASS}`);

        promise.done((formData) => {
            assert.deepEqual(formData, EXPECTED_DATA, 'new data is correct');
        });

        keyboardMock($input).type('Test').change();

        $(`.${DIALOG_CLASS} .${BUTTON_WITH_TEXT_CLASS}`)
            .first()
            .trigger('dxclick');
    });

    test('decline dialog by button click', function(assert) {
        assert.expect(1);

        const formDialog = new FormDialog(this.componentMock, { container: this.$element });
        const promise = formDialog.show({ items: ['name'] });
        const $input = $(`.${FORM_CLASS} .${TEXTEDITOR_INPUT_CLASS}`);

        promise.fail((formData) => {
            assert.notOk(formData, 'There is no data');
        });

        keyboardMock($input).type('Test').change();

        $(`.${DIALOG_CLASS} .${BUTTON_WITH_TEXT_CLASS}`)
            .last()
            .trigger('dxclick');
    });

    test('decline dialog on hiding', function(assert) {
        assert.expect(1);

        const formDialog = new FormDialog(this.componentMock, { container: this.$element });
        const promise = formDialog.show({ items: ['name'] });
        const $input = $(`.${FORM_CLASS} .${TEXTEDITOR_INPUT_CLASS}`);

        promise.fail((formData) => {
            assert.notOk(formData, 'There is no data');
        });

        keyboardMock($input).type('Test').change();

        formDialog._popup.hide();
    });

    test('decline dialog by escape key press', function(assert) {
        assert.expect(1);

        const formDialog = new FormDialog(this.componentMock, { container: this.$element });
        const promise = formDialog.show({ items: ['name'] });
        const $input = $(`.${FORM_CLASS} .${TEXTEDITOR_INPUT_CLASS}`);

        promise.fail((formData) => {
            assert.notOk(formData, 'There is no data');
        });

        keyboardMock($input).type('Test').change().keyDown('esc');
    });
});
