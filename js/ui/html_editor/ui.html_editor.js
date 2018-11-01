import $ from "../../core/renderer";
import { extend } from "../../core/utils/extend";
import { isDefined } from "../../core/utils/type";
import { getPublicElement } from "../../core/utils/dom";
import registerComponent from "../../core/component_registrator";
import EmptyTemplate from "../widget/empty_template";
import Editor from "../editor/editor";
import Errors from "../widget/ui.errors";

import QuillRegistrator from "./quill_registrator";
import "./converters/delta";
import ConverterController from "./converterController";
import getWordMatcher from "./matchers/wordLists";
import FormDialog from "./ui/formDialog";

const HTML_EDITOR_CLASS = "dx-htmleditor";
const QUILL_CONTAINER_CLASS = "dx-quill-container";

const MARKDOWN_VALUE_TYPE = "markdown";

const ANONYMOUS_TEMPLATE_NAME = "htmlContent";

const HtmlEditor = Editor.inherit({

    _getDefaultOptions: function() {
        return extend(this.callBase(), {
            /**
             * @name dxHtmlEditorOptions.focusStateEnabled
             * @type boolean
             * @default true
             * @inheritdoc
             */
            focusStateEnabled: true,

            /**
            * @name dxHtmlEditorOptions.onFocusIn
            * @extends Action
            * @type function(e)
            * @type_function_param1 e:object
            * @type_function_param1_field4 event:event
            * @action
            */
            /**
            * @name dxHtmlEditorOptions.onFocusOut
            * @extends Action
            * @type function(e)
            * @type_function_param1 e:object
            * @type_function_param1_field4 event:event
            * @action
            */

            /**
            * @name dxHtmlEditorOptions.valueType
            * @type Enums.HtmlEditorValueType
            * @default "html"
            */
            valueType: "html",
            /**
            * @name dxHtmlEditorOptions.placeholder
            * @type string
            * @default ""
            */
            placeholder: "",
            /**
            * @name dxHtmlEditorOptions.toolbar
            * @type dxHtmlEditorToolbar
            * @default null
            */
            toolbar: null,
            /**
            * @name dxHtmlEditorOptions.variables
            * @type dxHtmlEditorVariables
            * @default null
            */
            variables: null,

            formDialogOptions: null

            /**
            * @name dxHtmlEditorToolbar
            * @type object
            */
            /**
            * @name dxHtmlEditorToolbar.container
            * @type string|Node|jQuery
            */
            /**
            * @name dxHtmlEditorToolbar.items
            * @type Array<dxHtmlEditorToolbarItem,string>
            */

            /**
            * @name dxHtmlEditorToolbarItem
            * @inherits dxToolbarItemTemplate
            */
            /**
            * @name dxHtmlEditorToolbarItem.formatName
            * @type string
            */
            /**
            * @name dxHtmlEditorToolbarItem.formatValues
            * @type Array<string,number,boolean>
            */

            /**
            * @name dxHtmlEditorVariables
            * @type object
            */
            /**
            * @name dxHtmlEditorVariables.dataSource
            * @type string|Array<string>|DataSource|DataSourceOptions
            * @default null
            */
            /**
            * @name dxHtmlEditorVariables.escapeChar
            * @type string|Array<string>
            * @default ""
            */
        });
    },

    _init: function() {
        this.callBase();

        this._quillRegistrator = new QuillRegistrator();
        this._prepareConverters();
    },

    _prepareConverters: function() {
        if(!this._deltaConverter) {
            const DeltaConverter = ConverterController.getConverter("delta");

            if(DeltaConverter) {
                this._deltaConverter = new DeltaConverter();
            }
        }

        if(this.option("valueType") === MARKDOWN_VALUE_TYPE && !this._markdownConverter) {
            const MarkdownConverter = ConverterController.getConverter("markdown");

            if(MarkdownConverter) {
                this._markdownConverter = new MarkdownConverter();
            } else {
                throw Errors.Error("E1051", "markdown");
            }
        }
    },

    _getAnonymousTemplateName: function() {
        return ANONYMOUS_TEMPLATE_NAME;
    },

    _initTemplates: function() {
        this.callBase();

        this._defaultTemplates[ANONYMOUS_TEMPLATE_NAME] = new EmptyTemplate(this);
    },

    _initMarkup: function() {
        this._$htmlContainer = $("<div>").addClass(QUILL_CONTAINER_CLASS);

        this.$element()
            .addClass(HTML_EDITOR_CLASS)
            .wrapInner(this._$htmlContainer);

        const template = this._getTemplate(ANONYMOUS_TEMPLATE_NAME);
        const transclude = true;

        this._$templateResult = template && template.render({
            container: getPublicElement(this._$htmlContainer),
            noModel: true,
            transclude
        });

        this.callBase();

        this._updateContainerMarkup();
    },

    _hasTranscludeContent: function() {
        return this._$templateResult && this._$templateResult.length;
    },

    _updateContainerMarkup: function() {
        let markup = this.option("value");

        if(this._isMarkdownValue()) {
            markup = this._markdownConverter.toHtml(markup);
        }

        if(markup) {
            this._$htmlContainer.html(markup);
        }
    },

    _render: function() {
        this._renderHtmlEditor();
        this._renderFormDialog();

        this.callBase();
    },

    _renderHtmlEditor: function() {
        const modulesConfig = this._getModulesConfig();

        this._quillInstance = this._quillRegistrator.createEditor(this._$htmlContainer[0], {
            placeholder: this.option("placeholder"),
            readOnly: this.option("readOnly") || this.option("disabled"),
            modules: modulesConfig,
            theme: "basic"
        });

        this._deltaConverter.setQuillInstance(this._quillInstance);
        this._textChangeHandlerWithContext = this._textChangeHandler.bind(this);

        this._quillInstance.on("text-change", this._textChangeHandlerWithContext);

        if(this._hasTranscludeContent()) {
            this._updateHtmlContent(this._deltaConverter.toHtml());
        }
    },

    _getModulesConfig: function() {
        const wordListMatcher = getWordMatcher(this._quillRegistrator.getQuill());
        let modulesConfig = extend({
            toolbar: this._getModuleConfigByOption("toolbar"),
            variables: this._getModuleConfigByOption("variables"),
            dropImage: this._getBaseModuleConfig(),
            clipboard: {
                matchers: [
                    ['p.MsoListParagraphCxSpFirst', wordListMatcher],
                    ['p.MsoListParagraphCxSpMiddle', wordListMatcher],
                    ['p.MsoListParagraphCxSpLast', wordListMatcher]
                ]
            }
        }, this._getCustomModules());

        return modulesConfig;
    },

    _getModuleConfigByOption: function(userOptionName) {
        let userConfig = this.option(userOptionName);

        if(!isDefined(userConfig)) {
            return undefined;
        }

        return extend(this._getBaseModuleConfig(), userConfig);
    },

    _getBaseModuleConfig: function() {
        return { editorInstance: this };
    },

    _getCustomModules: function() {
        const modules = {};
        const moduleNames = this._quillRegistrator.getRegisteredModuleNames();

        moduleNames.forEach(modulePath => {
            modules[modulePath] = this._getBaseModuleConfig();
        });

        return modules;
    },

    _textChangeHandler: function(newDelta, oldDelta, source) {
        const htmlMarkup = this._deltaConverter.toHtml();

        this._isEditorUpdating = true;

        const value = this._isMarkdownValue() ? this._updateValueByType(MARKDOWN_VALUE_TYPE, htmlMarkup) : htmlMarkup;

        this.option("value", value);
    },

    _updateValueByType: function(valueType, value) {
        const converter = this._markdownConverter;

        if(!isDefined(converter)) {
            return;
        }

        const currentValue = value || this.option("value");

        return valueType === MARKDOWN_VALUE_TYPE ? converter.toMarkdown(currentValue) : converter.toHtml(currentValue);
    },

    _isMarkdownValue: function() {
        return this.option("valueType") === MARKDOWN_VALUE_TYPE;
    },

    _resetEnabledState: function() {
        if(this._quillInstance) {
            const isEnabled = !(this.option("readOnly") || this.option("disabled"));

            this._quillInstance.enable(isEnabled);
        }
    },

    _renderFormDialog: function() {
        const userOptions = extend(true, {
            width: "auto",
            height: "auto",
            closeOnOutsideClick: true
        }, this.option("formDialogOptions"));

        this._formDialog = new FormDialog(this, userOptions);
    },

    _optionChanged: function(args) {
        switch(args.name) {
            case "value":
                if(!this._quillInstance) {
                    this._$htmlContainer.html(args.value);
                    return;
                }

                if(this._isEditorUpdating) {
                    delete this._isEditorUpdating;
                } else {
                    const updatedValue = this._isMarkdownValue() ? this._updateValueByType("HTML", args.value) : args.value;
                    this._updateHtmlContent(updatedValue);
                }
                this.callBase(args);
                break;
            case "placeholder":
            case "variables":
            case "toolbar":
                this._invalidate();
                break;
            case "valueType":
                this._prepareConverters();
                const newValue = this._updateValueByType(args.value);

                if(args.value === "html" && this._quillInstance) {
                    this._updateHtmlContent(newValue);
                } else {
                    this.option("value", newValue);
                }
                break;
            case "readOnly":
            case "disabled":
                this.callBase(args);
                this._resetEnabledState();
                break;
            case "formDialogOptions":
                this._renderFormDialog();
                break;
            default:
                this.callBase(args);
        }
    },

    _updateHtmlContent: function(newMarkup) {
        const newDelta = this._quillInstance.clipboard.convert(newMarkup);
        this._quillInstance.setContents(newDelta);
    },

    _clean: function() {
        if(this._quillInstance) {
            this._quillInstance.off("text-change", this._textChangeHandlerWithContext);
        }

        this.callBase();
    },

    _applyQuillMethod(methodName, args) {
        if(this._quillInstance) {
            return this._quillInstance[methodName].apply(this._quillInstance, args);
        }
    },

    _applyQuillHistoryMethod(methodName) {
        if(this._quillInstance && this._quillInstance.history) {
            this._quillInstance.history[methodName]();
        }
    },

    /**
    * @name dxHtmlEditorMethods.registerModules
    * @publicName registerModules(modules)
    * @param1 modules:Object
    */
    registerModules: function(modules) {
        this._quillRegistrator.registerModules(modules);

        this.repaint();
    },

    /**
    * @name dxHtmlEditorMethods.getModule
    * @publicName getModule(modulePath)
    * @param1 modulePath:string
    * @return Object
    */
    getModule: function(modulePath) {
        return this._quillRegistrator.getQuill().import(modulePath);
    },

    /**
    * @name dxHtmlEditorMethods.getQuillInstance
    * @publicName getQuillInstance()
    * @return Object
    */
    getQuillInstance: function() {
        return this._quillInstance;
    },

    /**
    * @name dxHtmlEditorMethods.getSelection
    * @publicName getSelection()
    * @return Object
    */
    getSelection: function() {
        return this._applyQuillMethod("getSelection");
    },

    /**
    * @name dxHtmlEditorMethods.setSelection
    * @publicName setSelection(index, length)
    * @param1 index:number
    * @param2 length:number
    */
    setSelection: function(index, length) {
        this._applyQuillMethod("setSelection", arguments);
    },

    /**
    * @name dxHtmlEditorMethods.format
    * @publicName format(formatName, formatValue)
    * @param1 formatName:string
    * @param2 formatValue:any
    */
    format: function(formatName, formatValue) {
        this._applyQuillMethod("format", arguments);
    },

    /**
    * @name dxHtmlEditorMethods.formatText
    * @publicName formatText(index, length, formatName, formatValue)
    * @param1 index:number
    * @param2 length:number
    * @param3 formatName:string
    * @param4 formatValue:any
    */
    /**
    * @name dxHtmlEditorMethods.formatText
    * @publicName formatText(index, length, formats)
    * @param1 index:number
    * @param2 length:number
    * @param3 formats:object
    */
    formatText: function(index, length, formatName, formatValue) {
        this._applyQuillMethod("formatText", arguments);
    },

    /**
    * @name dxHtmlEditorMethods.formatLine
    * @publicName formatLine(index, length, formatName, formatValue)
    * @param1 index:number
    * @param2 length:number
    * @param3 formatName:string
    * @param4 formatValue:any
    */
    /**
    * @name dxHtmlEditorMethods.formatLine
    * @publicName formatLine(index, length, formats)
    * @param1 index:number
    * @param2 length:number
    * @param3 formats:object
    */
    formatLine: function(index, length, formatName, formatValue) {
        this._applyQuillMethod("formatLine", arguments);
    },

    /**
    * @name dxHtmlEditorMethods.getFormat
    * @publicName getFormat(index, length)
    * @param1 index:number
    * @param2 length:number
    * @return Object
    */
    getFormat: function(index, length) {
        return this._applyQuillMethod("getFormat", arguments);
    },

    /**
    * @name dxHtmlEditorMethods.removeFormat
    * @publicName removeFormat(index, length)
    * @param1 index:number
    * @param2 length:number
    */
    removeFormat: function(index, length) {
        return this._applyQuillMethod("removeFormat", arguments);
    },

    /**
    * @name dxHtmlEditorMethods.clearHistory
    * @publicName clearHistory()
    */
    clearHistory: function() {
        this._applyQuillHistoryMethod("clear");
    },

    /**
    * @name dxHtmlEditorMethods.undo
    * @publicName undo()
    */
    undo: function() {
        this._applyQuillHistoryMethod("undo");

    },

    /**
    * @name dxHtmlEditorMethods.redo
    * @publicName redo()
    */
    redo: function() {
        this._applyQuillHistoryMethod("redo");

    },

    /**
    * @name dxHtmlEditorMethods.getLength
    * @publicName getLength()
    * @return number
    */
    getLength: function() {
        return this._applyQuillMethod("getLength");
    },

    /**
    * @name dxHtmlEditorMethods.delete
    * @publicName delete(index, length)
    * @param1 index:number
    * @param2 length:number
    */
    delete: function(index, length) {
        this._applyQuillMethod("deleteText", arguments);
    },

    /**
    * @name dxHtmlEditorMethods.insertText
    * @publicName insertText(index, text, formats)
    * @param1 index:number
    * @param2 text:string
    * @param3 formats:object
    */
    insertText: function(index, text, formats) {
        this._applyQuillMethod("insertText", arguments);
    },

    /**
    * @name dxHtmlEditorMethods.insertEmbed
    * @publicName insertEmbed(index, type, config)
    * @param1 index:number
    * @param2 type:string
    * @param3 config:any
    */
    insertEmbed: function(index, type, config) {
        this._applyQuillMethod("insertEmbed", arguments);
    },

    showFormDialog: function(formConfig) {
        return this._formDialog.show(formConfig);
    },

    formDialogOption: function(optionName, optionValue) {
        return this._formDialog.popupOption.apply(this._formDialog, arguments);
    }
});

registerComponent("dxHtmlEditor", HtmlEditor);

module.exports = HtmlEditor;
