﻿class respite_crud {
    // Public Members
    dt_Columns;
    dt_Order;
    dt_Buttons;

    dt_InlineActionButtons;
    dt_ToolbarActionButtons;

    respite_editor_options;
    dt;
    row;
    detail_rows;
    DM_form_rendered = false;

    isEditBtnAdded = false;
    isDeleteBtnAdded = false;
    isCloneBtnAdded = false;
    isDetailRowsAdded = false;

    // Default callback functions

    // pre-submit callback 
    static callbackPreRequest(formData, jqForm, options) {
        // jqForm is a jQuery object encapsulating the form element.  To access the 
        // DOM element for the form do this: 
        var formElement = jqForm[0];

        $(formElement.getAttribute('form-modal')).modal('hide');
        respite_crud.dt.buttons.info('Processing...', '<h3 class="text-center"><i class="fas fa-spinner fa-pulse"></i></h3>');

        // returning anything other than false will allow the form submit to continue 
        return true;
    }

    // post-submit callback 
    static callbackPostResponse(response, statusType, xhr, $form) {
        // for normal html responses, the first argument to the success callback 
        // is the XMLHttpRequest object's responseText property 

        // if the ajaxForm method was passed an Options Object with the dataType 
        // property set to 'xml' then the first argument to the success callback 
        // is the XMLHttpRequest object's responseXML property 

        // if the ajaxForm method was passed an Options Object with the dataType 
        // property set to 'json' then the first argument to the success callback 
        // is the json data object returned by the server 
        var btnsm = '<div class="ml-auto float-right"><button type="button" role="button" class="btn btn-secondary btn-sm" onclick="respite_crud.dt.buttons.info(false)" aria-label="Close" title="Close"><span aria-hidden="true">&times;</span></button></div>';
        var btn = '<br/><br/><button type="" class="btn btn-secondary" onclick="respite_crud.dt.buttons.info(false)">Close</button>';

        if (statusType == 'error') {
            respite_crud.dt.buttons.info('<i class="fas fa-exclamation-triangle"></i> ' + response.status + ' ' + response.statusText + btnsm, 'Response Body:<br/><div class="alert alert-danger">' + respite_crud.escapeHtml(response.responseText) + '</div>' + btn);
        }
        else {
            respite_crud.dt.buttons.info('<i class="fas fa-check-circle"></i> ' + xhr.statusText + btnsm, response['data'] + btn, 10000);
        }

        // refresh datatable:
        respite_crud.dt.ajax.reload();

        //alert('status: ' + statusType + '\n\nresponse: \n' + response['data'] + 
        //    '\n\nThe output div should have already been updated with the responseText.'); 
    }

    static getColumnByName(colName) {
        if (respite_crud.dt_Columns == undefined)
            return undefined;
        else {
            var col;

            for (var i = 0; i < respite_crud.dt_Columns.length && col == undefined; i++) {
                if (respite_crud.dt_Columns[i]['name'] == colName)
                    col = respite_crud.dt_Columns[i];
            }

            return col;
        }
    }

    // Detail Row Formatting
    /* this will print out all fields and sub-fields and their values */
    static formatDetailsRow(d) {
        if (d != undefined) {
            var rv = "";
            for (var dKey in d) {
                var col = respite_crud.getColumnByName(dKey);

                if (col == undefined)
                    col = "";
                else if (col['editor_data'] == undefined)
                    col = "";
                else
                    col = col['editor_data'];

                if (typeof d[dKey] === "object" || typeof d[dKey] === "array") {
                    // recursive:
                    rv += "<b>" + col['label'] + ':</b><div class="container-fluid">' + formatDetailsRow(d[dKey]) + '</div>';
                } else if (col != "") {
                    // simple string (stop condition):
                    rv += col['label'] + ": " + respite_crud.renderAutomatic_ed(d[dKey], col, d) + "<br/> ";
                }
            }
            
            return rv;
        }
        else
            return 'Empty row';
    }

    // Init Options Function
    static setEditorOptions(options) {

        // init defaults
        if (respite_crud.respite_editor_options == undefined)
            respite_crud.respite_editor_options = {
                dt_Options: {
                    dt_Selector: '#mainGrid', // jquery selector for the <table> element to use for datatable
                    dt_AjaxGet: 'datatable_pilot_backend.asp?mode=datatable', // server-side source for datatable
                    dt_DetailRowRender: respite_crud.formatDetailsRow // render function to display details of a single record
                },
                modal_Options: {
                    ajax_forms_selector: "form.ajax-form",
                    pre_submit_callback: respite_crud.callbackPreRequest,
                    response_success_callback: respite_crud.callbackPostResponse,
                    response_error_callback: respite_crud.callbackPostResponse,
                    modal_edit: {
                        modal_selector: '#modal_edit',
                        modal_title_selector: '#modal_edit_title',
                        modal_body_selector: '#modal_edit_body',
                        form_selector: 'form[name=modal_edit_form]',
                        delete_button_selector: '#modal_btn_delete'
                    },
                    modal_delete: {
                        modal_selector: '#modal_delete',
                        modal_title_selector: '#modal_delete_title',
                        modal_body_selector: '#modal_delete_body',
                        form_selector: 'form[name=modal_delete_form]'
                    },
                    modal_response: {
                        modal_selector: '#modal_response',
                        modal_title_selector: '#modal_response_title',
                        modal_body_selector: '#modal_response_body'
                    }
                }
            }

        // override options
        if (options != undefined)
            for (var key in options)
                respite_crud.respite_editor_options[key] = options[key];
    }

    // AJAX Form initialization
    /*
    options: {
            target:         string    // target element(s) to be updated with server response
            , beforeSubmit: function (formData, jqForm, options) {}          // pre-submit callback
            , success:      function (response, statusType, xhr, $form) {}          // post-submit callback
            , error:        function (xhr, statusType, $form)              // post-submit callback

            // other available options:
            // ,url:        string                                     // override for form's 'action' attribute
            // ,type:       string                                     // 'get' or 'post', override for form's 'method' attribute
             , dataType:    string                                     // 'xml', 'script', or 'json' (expected server response type)
            // ,clearForm:  boolean                                     // clear all form fields after successful submit
            // ,resetForm:  boolean                                     // reset the form after successful submit

            // $.ajax options can be used here too, for example:
            // ,timeout:    int
    }
    */
    static initAjaxForm(options) {
        // init defaults
        var setOptions = {
              target: respite_crud.respite_editor_options.modal_Options.modal_response.modal_body_selector    // target element(s) to be updated with server response
            , beforeSubmit: respite_crud.respite_editor_options.modal_Options.pre_submit_callback           // pre-submit callback
            , success: respite_crud.respite_editor_options.modal_Options.response_success_callback          // post-submit callback
            , error: respite_crud.respite_editor_options.modal_Options.response_error_callback              // post-submit callback

            // other available options:
            // ,url:       null                                     // override for form's 'action' attribute
            // ,type:      null                                     // 'get' or 'post', override for form's 'method' attribute
             , dataType: 'json'                                     // 'xml', 'script', or 'json' (expected server response type)
            // ,clearForm: true                                     // clear all form fields after successful submit
            // ,resetForm: true                                     // reset the form after successful submit

            // $.ajax options can be used here too, for example:
            // ,timeout:   3000
        }

        // override options
        if (options != undefined) 
            for (var key in options)
                setOptions[key] = options[key];
        
        $(respite_crud.respite_editor_options.modal_Options.ajax_forms_selector).ajaxForm(setOptions);
    }
    // Utility Functions
    static focusFirstField(e) {
        var frm = $(respite_crud.respite_editor_options.modal_Options.modal_edit.form_selector);
        var firstInput = $(":input:not(input[type=button],input[type=submit],button):visible:first", frm);
        firstInput.focus();
    }
    static hideModal(modalSelector) {
        $(modalSelector).modal('hide')
    }
    static escapeHtml(v) {
        return (v != undefined ? $("<div></div>").text(v).html() : '');
    }

    static renderBoolean_ed(data, ed) {
        return (data == "true" || data == "1") ?
          '<i class="fas fa-check-circle text-success" title="' + data + '"></i>' :
          '<i class="fas fa-times-circle text-danger" title="' + data + '"></i>';
    }
    static renderBoolean(data, type, row, meta) {
        var oColumn = meta.settings.aoColumns[meta.col];
        return renderBoolean_ed(data, oColumn['editor_data']);
    }

    static renderLookup_ed(data, ed) {
        if (data != '' && data != undefined && ed != undefined && ed['options'] != undefined) {
            var opList = ed.options;

            for (var i = 0; i < opList.length; i++) {
                if (opList[i].value == data) {
                    return opList[i].label;
                }
            }
        }
        return data;
    }
    static renderLookup(data, type, row, meta) {
        return renderLookup_ed(data, oColumn['editor_data']);
    }

    static renderCSVLookup_ed(data, ed) {
        var rv = "";
        if (data != '' && data != undefined && ed != undefined && ed['options'] != undefined) {

            var opList = ed.options;
            var dataList = data.split(",");

            for (var j = 0; j < dataList.length; j++) {
                for (var i = 0; i < opList.length; i++) {

                    if (opList[i].value == dataList[j]) {
                        if (rv.length > 0) rv += ", ";
                        rv += opList[i].label.trim();
                    }
                }
            }
        }
        if (rv.length == 0) rv = data;
        return rv;
    }
    static renderCSVLookup(data, type, row, meta) {
        var oColumn = meta.settings.aoColumns[meta.col];
        return renderCSVLookup_ed(data, oColumn['editor_data']);
    }

    static renderLink_ed(data, ed, id) {
        var rv = "";
        if (((id != null && id != undefined) || (data != '' && data != undefined)) && ed != undefined && ed["label"] != undefined) {
            rv = '<a href="' + respite_crud.escapeHtml(data) + '"';

            if (id != null && id != undefined)
                rv += ' id="' + id + '"';

            var attr = ed["attributes"];
            for (var attrName in attr) {
                rv += ' ' + attrName + '="' + respite_crud.escapeHtml(attr[attrName]) + '"';
            }
            rv += '>' + ed["label"] + '</a>';
        }

        if (rv.length == 0) rv = data;
        return rv;
    }
    static renderLink(data, type, row, meta) {
        var ed = (meta != undefined && meta.settings.aoColumns[meta.col] != undefined ? meta.settings.aoColumns[meta.col]['editor_data'] : undefined);
        return respite_crud.renderLink_ed(data, ed, null);
    }

    static replaceRowPlaceholders(data, row, self) {
        if (self != undefined && self != null)
            data = data.replace('{{this}}', self);

        for (var fieldKey in row) {
            data = data.replace('{{row[' + fieldKey + ']}}', row[fieldKey]);
        }

        return data;
    }

    static renderAutomatic_ed(data, ed, row) {
        var rv = "";
        if (data != undefined && data != '' && ed != undefined) {
            switch (ed["type"]) {
                case "boolean":
                    rv = respite_crud.renderBoolean_ed(data, ed);
                    break;
                case "csv":
                    rv = respite_crud.renderCSVLookup_ed(data, ed);
                    break;
                case "select":
                    rv = respite_crud.renderLookup_ed(data, ed);
                    break;
                case "link":
                    rv = respite_crud.renderLink_ed(data, ed);
                    break;
                default:
                    rv = data;
            }

            if (ed['wrap_link'] != undefined && ed["type"] != 'link' && row != undefined) {
                var newLink = $('<a></a>').prop('href', respite_crud.replaceRowPlaceholders(ed['wrap_link']['href'], row, data)).addClass(ed['wrap_link']['css'])
                .append(rv);

                rv = newLink[0].outerHTML;
            }
        }

        if (rv.length == 0) rv = data;
        return rv;
    }

    static renderAutomatic(data, type, row, meta) {
        var oColumn = meta.settings.aoColumns[meta.col];
        return respite_crud.renderAutomatic_ed(data, oColumn['editor_data'], row);
    }
            
    // This function runs after the data manipulation form is rendered
    static postRenderDMFormFields(e) {
        if (!respite_crud.DM_form_rendered) {
            //$('[data-toggle="tooltip"]').tooltip();
            $('.summernote textarea').each(function (i) {
                var currObj = $(this);
                currObj.summernote({
                    minHeight: currObj.attr('minHeight'),
                    maxHeight: currObj.attr('maxHeight'),
                    height: currObj.attr('height'),
                    width: currObj.attr('width'),
                    placeholder: currObj.attr('placeholder'),
                    focus: true,
                    tabsize: 2,
                    dialogsInBody: true,
                    codemirror: { // codemirror options
                        theme: 'monokai'
                    }
                });
            });

            respite_crud.DM_form_rendered = true;
        }
        respite_crud.focusFirstField(e);
    }
    // Data Manipulation Modals
    static showDMModal(r, mode) {
        var modal_options = respite_crud.respite_editor_options.modal_Options.modal_edit;

        // save to static row object for the Deletion modal to access
        if (r == undefined || r == null)
            respite_crud.row = respite_crud.initDefaultRow();
        else
            respite_crud.row = r;

        // init modal title and deletion button
        if (mode == "edit") {
            $(modal_options.modal_title_selector).text("Edit Item RowID: " + respite_crud.row.DT_RowId);   // localization.modal_edit_title
            $(modal_options.delete_button_selector).show();
        }
        else {
            $(modal_options.modal_title_selector).text("Add Item");                         // localization.modal_add_title
            $(modal_options.delete_button_selector).hide();
        }

        if (!respite_crud.DM_form_rendered) {
            // first render of modal form fields
            $(modal_options.modal_body_selector).html(respite_crud.renderDMFormFields(respite_crud.row));
            $(modal_options.modal_selector).on('shown.bs.modal', respite_crud.postRenderDMFormFields);
        }
        else
        {
            // re-fill existing modal form fields
            respite_crud.fillDMFormFields(respite_crud.row, modal_options.form_selector);
        }

        // init form global fields
        $('input[name=DT_RowId]', $(modal_options.form_selector)).val(respite_crud.row.DT_RowId);   // input_init_values: [ { input_name: value } ]
        $('input[name=mode]', $(modal_options.form_selector)).val(mode);
        $(modal_options.modal_selector).modal({ show: true, keyboard: true, focus: true });
    }
    static showDelete(r) {
        var modal_options = respite_crud.respite_editor_options.modal_Options.modal_delete;

        $(modal_options.modal_body_selector).html(respite_crud.respite_editor_options.dt_Options.dt_DetailRowRender(r)); // render modal with row details
        $('input[name=DT_RowId]', $(modal_options.form_selector)).val(r.DT_RowId); // input_init_values: [ { input_name: value } ]
        $('input[name=mode]', $(modal_options.form_selector)).val("delete");
        $(modal_options.modal_selector).modal({ show: true, keyboard: true, focus: true });
    }
    static showDeleteMultiple(e, dt, node, config) {
        var modal_options = respite_crud.respite_editor_options.modal_Options.modal_delete;

        var r = dt.rows({ selected: true }).data();
        var rowIds = "";
        var content = "Deleting " + r.length + " row(s):";

        for (var i = 0; i < r.length; i++) {
            if (rowIds.length > 0) rowIds += ", ";
            rowIds += r[i].DT_RowId;
            content += "<hr/> " + respite_crud.respite_editor_options.dt_Options.dt_DetailRowRender(r[i]);                          // concatenate_row_details
        }

        $(modal_options.modal_body_selector).html(content);                                      // modal_body_selector
        $('input[name=DT_RowId]', $(modal_options.form_selector)).val(rowIds);         // modal_form_name, input_init_values: [ { input_name: value } ]
        $('input[name=mode]', $(modal_options.form_selector)).val("delete_multiple");  // modal_form_name
        $(modal_options.modal_selector).modal({ show: true, keyboard: true, focus: true });      // modal_to_show, modal_options = {}
    }

    // Init Default Row (when adding)
    static initDefaultRow() {
        var r = {}

        for (var i = 0; i < respite_crud.dt.columns()[0].length; i++) {
            var ed = respite_crud.dt.column(i).editor_data();
            var cn = respite_crud.dt.column(i).dataSrc();

            if (ed != undefined && cn != undefined) {
                r[cn] = ed["default_value"];
            } else {
                r[cn] = null;
            }
        }

        return r;
    }

    // Data Manipulation Modal Formatting (rendering form fields)
    static renderDMFormFields(d) {
        var content = "";
        var closing_string = "";
        //console.log(d);
        for (var i = 0; i < respite_crud.dt.columns()[0].length; i++) {
            var ed = respite_crud.dt.column(i).editor_data();
            var cn = respite_crud.dt.column(i).dataSrc();
            //console.log("column " + i + " (" + cn + "): " + d[cn]);

            if (ed != undefined && !ed["hidden"]) {
                content += '<div class="form-group' + (ed['type'] == "rte" ? ' summernote' : '') + '" data-toggle="tooltip" title="' + respite_crud.escapeHtml(ed['tooltip']) + '">';
                content += '<label for="field_' + i + '" class="control-label col-sm-2 col-md-3 col-lg-4">';

                if (ed["help"] != undefined && ed["help"] != "") {
                    content += '<div class="ml-auto float-right"><a class="btn btn-link text-info" data-toggle="collapse" data-target="#help_field_' + i + '" aria-expanded="false" aria-controls="help_field_' + i + '" title="Help"><i class="fas fa-question-circle"></i></a></div>';
                }

                content += respite_crud.escapeHtml(ed['label']) + '</label>';

                // open html element tag
                switch (ed['type']) {
                    case "money":
                    case "decimal":
                    case "integer":
                    case "numeric":
                    case "number":
                        content += '<input tabindex="' + i + '" class="form-control form-control-sm" type="number" id="field_' + i + '" name="' + cn + '" value="' + respite_crud.escapeHtml(d[cn]) + '" step="1"';
                        // TODO: add format validation based on type (using the "pattern" attribute with regex: https://www.w3schools.com/tags/att_input_pattern.asp )
                        closing_string = "/>";
                        break;
                    case "select":
                    case "csv":
                        content += '<select tabindex="' + i + '" class="form-control form-control-sm" id="field_' + i + '" name="' + cn + '"';
                        if (ed['type'] == "csv")
                            content += ' multiple';
                        closing_string = '</select>';
                        break;
                    case "rte":
                    case "textarea":
                        content += '<textarea tabindex="' + i + '" class="form-control form-control-sm" id="field_' + i + '" name="' + cn + '"';
                        closing_string = '</textarea>';
                        break;
                    case "boolean":
                        // using bootswatch switch custom control
                        content += '<div class="custom-control custom-switch"><input tabindex="' + i + '" id="field_' + i + '" type="checkbox" value="true" class="custom-control-input" name="' + cn + '"' + (d[cn] == "true" || d[cn] == true ? ' checked' : '');
                        closing_string = '><label for="field_' + i + '" class="custom-control-label"></label></div>';
                        break;
                    case "password":
                        content += '<input tabindex="' + i + '" class="form-control form-control-sm" type="password" id="field_' + i + '" name="' + cn + '" value=""';
                        closing_string = '/>';
                        break;
                    case "time":
                        content += '<input tabindex="' + i + '" class="form-control form-control-sm" type="time" id="field_' + i + '" name="' + cn + '" value="' + respite_crud.escapeHtml(d[cn]).substr(0, 8) + '" step="1" maxlength="8"';
                        closing_string = '/>';
                        break;
                    case "date":
                        content += '<input tabindex="' + i + '" class="form-control form-control-sm" type="date" id="field_' + i + '" name="' + cn + '" value="' + respite_crud.escapeHtml(d[cn]).substr(0, 10) + '" step="1" maxlength="10"';
                        closing_string = '/>';
                        break;
                    case "datetime":
                        content += '<input tabindex="' + i + '" class="form-control form-control-sm" type="datetime-local" id="field_' + i + '" name="' + cn + '" value="' + respite_crud.escapeHtml(d[cn]).substr(0, 20) + '" step="1" maxlength="20"';
                        closing_string = '/>';
                        break;
                        // TODO: more field types: formula, image (upload), document (upload), bitwise
                        // some of these field types would also require additional render functions
                        // additionally, a few custom types based on https://bootswatch.com : csv_checkbox, csv_buttons, select_radio, select_buttons
                        // TODO: additional column options (some of these are relevant to the grid table only): glyph, help, tooltip, cssView, cssCell, cssColumnHeader
                        // TODO: preset column attributes per field type: tooltip, placeholder, min, max, maxlength, format (pattern), required, height, width, read-only, cssEdit

                    case "link":
                        content += respite_crud.renderLink_ed(d[cn], ed, 'field_' + i);
                        closing_string = "";
                        break;
                    /*case "image":
                        content += '<div class="col"><img id="field_' + i + '_src" src="' + respite_crud.escapeHtml(d[cn]) + '" class="img-fluid"/><br/><br/>';
                        content += '<input tabindex="' + i + '" class="form-control form-control-sm" type="text" id="field_' + i + '" name="' + cn + '" value="' + respite_crud.escapeHtml(d[cn]) + '"';

                        //content += '<div class="custom-file">';
                        //content += '<input tabindex="' + i + '" type="file" name="' + cn + '" id="field_' + i + '" class="custom-file-input"';
                        //closing_string = '/><label class="custom-file-label" for="validatedCustomFile">Choose file...</label><div class="invalid-feedback">Example invalid custom file feedback</div></div>';
                        closing_string = "/></div>";
                        break;*/
                    case "phone":
                    case "email":
                    case "text":
                    default:
                        content += '<input tabindex="' + i + '" class="form-control form-control-sm" type="' + respite_crud.escapeHtml(ed['type']) + '" id="field_' + i + '" name="' + cn + '" value="' + respite_crud.escapeHtml(d[cn]) + '"';
                        closing_string = "/>";
                }

                // append any attributes
                if (ed['attributes'] != undefined && ed['type'] != "link") {
                    var attr = ed['attributes'];
                    for (var attrName in attr) {
                        if (ed['type'] != "boolean" || attrName != "required")
                            content += ' ' + attrName + '="' + respite_crud.escapeHtml(attr[attrName]) + '"';
                    }
                }

                // fill with any content inside element tag
                switch (ed['type']) {
                    case "select":
                    case "csv":
                        content += '>';
                        var dValues = [];
                        if (ed['options'] != undefined) {

                            if (d[cn] != undefined && ed['type'] == "csv")
                                dValues = d[cn].split(",");
                            else if (d[cn] != undefined) // if not csv, init array of single value
                            {
                                dValues = [d[cn]];

                                // generate optional empty value if such was not provided in options already
                                if (ed['attributes']['required'] != 'true') {
                                    var bFoundEmptyOpt = false;

                                    for (var j = 0; j < ed['options'].length; j++) {
                                        if (ed['options'][j]['value'] == '')
                                            bFoundEmptyOpt = true;
                                    }

                                    if (!bFoundEmptyOpt) {
                                        content += '<option value=""';
                                        if (d[cn] == '')
                                            content += ' selected';
                                        content += '></option>';
                                    }
                                }
                            }

                            var prevOptGroup = undefined;

                            for (var j = 0; j < ed['options'].length; j++) {
                                if (prevOptGroup != ed['options'][j]['group']) {
                                    if (prevOptGroup != undefined)
                                        content += '</optgroup>';
                                    if (ed['options'][j]['group'] != '')
                                        content += '<optgroup label="' + respite_crud.escapeHtml(ed['options'][j]['group']) + '">';
                                    prevOptGroup = ed['options'][j]['group'];
                                }
                                content += '<option value="' + respite_crud.escapeHtml(ed['options'][j]['value']) + '"';

                                for (var k = 0; k < dValues.length; k++) {
                                    content += (dValues[k] == ed['options'][j]['value'] ? ' selected' : '');
                                }

                                content += '>' + respite_crud.escapeHtml(ed['options'][j]['label']) + '</option>';
                            }
                            if (prevOptGroup != undefined && prevOptGroup != '')
                                content += '</optgroup>';
                        }
                        break;
                    case "rte":
                    case "textarea":
                        content += '>' + respite_crud.escapeHtml(d[cn]);
                        break;
                        // TODO: more field types
                    default:
                }
                // close element
                content += closing_string + '</div>';
                if (ed["help"] != undefined && ed["help"] != "") {
                    content += '<div id="help_field_' + i + '" class="collapse bg-info"><div class="ml-auto float-right"><button type="button" role="button" class="btn btn-secondary btn-sm" data-toggle="collapse" data-target="#help_field_' + i + '" aria-expanded="false" aria-controls="help_field_' + i + '" aria-label="Close" title="Close"><span aria-hidden="true">&times;</span></button></div>' + ed["help"] + '</div>';
                }
            }
        }

        return content;
    }

    // Fill Existing Data Manipulation Form
    static fillDMFormFields(d, form_selector) {
        for (var i = 0; i < respite_crud.dt.columns()[0].length; i++) {
            var ed = respite_crud.dt.column(i).editor_data();
            var cn = respite_crud.dt.column(i).dataSrc();

            if (ed != undefined) {
                switch (ed['type']) {
                    case "image":
                        //$('#field_' + i + '_src').prop('src', respite_crud.escapeHtml(d[cn]));
                        //$('#field_' + i, $(form_selector)).val(respite_crud.escapeHtml(d[cn]));
                        //break;
                    case "document":
                    case "file":
                        // upload inputs must always be set to empty string only
                        $('#field_' + i, $(form_selector)).val("");
                        break;
                    case "csv":
                        // de-select all currently selected options
                        $('#field_' + i + ' option').prop('selected', false);

                        // re-select based on row data
                        if (d[cn] != undefined && ed['options'] != undefined) {
                            var dValues = d[cn].split(",");

                            for (var j = 0; j < ed['options'].length; j++) {
                                for (var k = 0; k < dValues.length; k++) {
                                    if (dValues[k] == ed['options'][j]['value'])
                                        $('#field_' + i + ' option[value="' + respite_crud.escapeHtml(ed['options'][j]['value']) + '"]').prop('selected', true);
                                }
                            }

                        }
                        break;
                    case "link":
                        $('#field_' + i).prop('href', d[cn]);
                        break;
                    case "rte":
                        $('#field_' + i).summernote('code', d[cn]);
                        break;
                    case "boolean":
                        $('#field_' + i, $(form_selector)).prop('checked', (d[cn] == "true" || d[cn] == true));
                        break;
                    default:
                        $('#field_' + i, $(form_selector)).val(respite_crud.escapeHtml(d[cn]));
                }
            }
            else
                $('#field_' + i, $(form_selector)).val(respite_crud.escapeHtml(d[cn]));
        }
    }

    static getNextActionButtonIndex() {
        return (respite_crud.dt_InlineActionButtons == undefined ? 0 : respite_crud.dt_InlineActionButtons.length);
    }

    static renderInlineActionButtons(data, type, row, meta) {
        var rv = "<span style=\"white-space: nowrap\">";

        for (var i = 0; respite_crud.dt_InlineActionButtons != undefined && i < respite_crud.dt_InlineActionButtons['length']; i++) {

            rv += ' <a href="' + respite_crud.dt_InlineActionButtons[i]['href'] + '" class="' + respite_crud.dt_InlineActionButtons[i]['class'] + '" role="button" title="' + respite_crud.dt_InlineActionButtons[i]['title'] + '">';

            if (respite_crud.dt_InlineActionButtons[i]['glyph'] != "" && respite_crud.dt_InlineActionButtons[i]['glyph'] != undefined)
                rv += '<i class="' + respite_crud.dt_InlineActionButtons[i]['glyph'] + '"></i>';

            if (respite_crud.dt_InlineActionButtons[i]['label'] != "" && respite_crud.dt_InlineActionButtons[i]['label'] != undefined)
                rv += ' ' + respite_crud.dt_InlineActionButtons[i]['label'];

            rv += '</a>';
        }

        rv += "</span>";

        return rv;
    }

    /*
    objButton: {
        href: string,
        class: string,
        title: string,
        glyph: string,
        label: string
    },
    onClickFunction: function (e, tr, r) {}
    */
    static addInlineActionButton(objButton, onClickFunction) {
        if (respite_crud.dt_InlineActionButtons == undefined) {
            respite_crud.dt_InlineActionButtons = [];
        }

        if (onClickFunction != undefined) {
            var btnClassName = "respite_btn_" + respite_crud.getNextActionButtonIndex();
            $('tbody', $(respite_crud.respite_editor_options.dt_Options.dt_Selector)).on('click', 'tr td a.' + btnClassName, function (e) {     // datatable_selector
                var tr = $(this).closest('tr');
                var r = respite_crud.dt.row(tr).data();
                onClickFunction(e, tr, r);
            });

            if (objButton['class'] != undefined)
                objButton['class'] += " " + btnClassName;
            else
                objButton['class'] = btnClassName;

            //console.log("Added custom inline action button ");
            //console.log(onClickFunction);
        }

        respite_crud.dt_InlineActionButtons.push(objButton);

        // return self to allow chaining
        return respite_crud;
    }

    //// DETAIL ROW Initialization ////
    static addDetailsButton(render_function) {
        //if (respite_crud.dt == undefined)
        //    throw "Error: addDetailsButton cannot be used before the datatable is initialized!";

        if (render_function != undefined)
            respite_crud.respite_editor_options.dt_Options.dt_DetailRowRender = render_function;

        // expose our "editor_data" extra column option using the api:
        $.fn.dataTable.Api.registerPlural('columns().editor_data()', 'column().editor_data()', function (setter) {
            return this.iterator('column', function (settings, column) {
                var col = settings.aoColumns[column];

                if (setter !== undefined) {
                    col.editor_data = setter;
                    return this;
                }
                else {
                    return col.editor_data;
                }
            }, 1);
        });

        // Array to track the ids of the details displayed rows
        respite_crud.detailRows = [];

        $('tbody', $(respite_crud.respite_editor_options.dt_Options.dt_Selector)).on('click', 'tr td a.details-control', function (e) {     // datatable_selector
            var tr = $(this).closest('tr');
            var row = respite_crud.dt.row(tr);                                                   // dt object
            var idx = $.inArray(tr.attr('id'), respite_crud.detailRows);
            var glyph = $('i', $(this));

            if (row.child.isShown()) {
                tr.removeClass('details');
                glyph.removeClass('fa-minus-circle');
                glyph.addClass('fa-plus-circle');
                $(this).removeClass('text-danger');
                $(this).addClass('text-success');
                row.child.hide();

                // Remove from the 'open' array
                respite_crud.detailRows.splice(idx, 1);
            }
            else {
                tr.addClass('details');
                glyph.removeClass('fa-plus-circle');
                glyph.addClass('fa-minus-circle');
                $(this).removeClass('text-success');
                $(this).addClass('text-danger');
                row.child(respite_crud.respite_editor_options.dt_Options.dt_DetailRowRender(row.data())).show();

                // Add to the 'open' array
                if (idx === -1) {
                    respite_crud.detailRows.push(tr.attr('id'));
                }
            }
        });

        respite_crud.isDetailRowsAdded = true;

        // return self to allow chaining
        return respite_crud.addInlineActionButton(
            {
                "href": "javascript:void(0)",
                "class": "btn-link text-success details-control",
                "title": "Details",
                "glyph": "fas fa-plus-circle",
                "label": ""
            });
    }

    //// INLINE Data Manipulation Buttons Initialization ////
    static addEditButton(title, label, glyph, customClass) {
        var btnClassName = "respite_btn_" + respite_crud.getNextActionButtonIndex();

        $('tbody', $(respite_crud.respite_editor_options.dt_Options.dt_Selector)).on('click', 'tr td a.' + btnClassName, function (e) {     // datatable_selector
            var tr = $(this).closest('tr');
            var r = respite_crud.dt.row(tr).data();                                             // dt object
            respite_crud.showDMModal(r, "edit");
        });

        return respite_crud.addInlineActionButton(
            {
                "href": "javascript:void(0)",
                "class": (customClass == undefined || customClass == null ? "btn btn-success btn-sm" : customClass) + " " + btnClassName,
                "title": (title == undefined || title == null ? "Edit" : title),
                "glyph": (glyph == undefined || glyph == null ? "fas fa-edit" : glyph),
                "label": (label == undefined || label == null ? "" : label)
            });
    }
    static addCloneButton(title, label, glyph, customClass) {
        var btnClassName = "respite_btn_" + respite_crud.getNextActionButtonIndex();

        $('tbody', $(respite_crud.respite_editor_options.dt_Options.dt_Selector)).on('click', 'tr td a.' + btnClassName, function (e) {
            var tr = $(this).closest('tr');
            var r = respite_crud.dt.row(tr).data();
            respite_crud.showDMModal(r, "add");
        });

        return respite_crud.addInlineActionButton(
            {
                "href": "javascript:void(0)",
                "class": (customClass == undefined || customClass == null ? "btn btn-info btn-sm" : customClass) + " " + btnClassName,
                "title": (title == undefined || title == null ? "Clone" : title),
                "glyph": (glyph == undefined || glyph == null ? "fas fa-copy" : glyph),
                "label": (label == undefined || label == null ? "" : label)
            });
    }
    static addDeleteButton(title, label, glyph, customClass) {
        var btnClassName = "respite_btn_" + respite_crud.getNextActionButtonIndex();

        $('tbody', $(respite_crud.respite_editor_options.dt_Options.dt_Selector)).on('click', 'tr td a.' + btnClassName, function (e) {    // datatable_selector
            var tr = $(this).closest('tr');
            var r = respite_crud.dt.row(tr).data();                                              // dt object
            respite_crud.showDelete(r);
        });

        return respite_crud.addInlineActionButton(
            {
                "href": "javascript:void(0)",
                "class": (customClass == undefined || customClass == null ? "btn btn-danger btn-sm" : customClass) + " " + btnClassName,
                "title": (title == undefined || title == null ? "Delete" : title),
                "glyph": (glyph == undefined || glyph == null ? "far fa-trash-alt" : glyph),
                "label": (label == undefined || label == null ? "" : label)
            });
    }

    static addToolbarActionButton(objButton) {
        if (respite_crud.dt != undefined) {
            throw "Error: Toolbar Action Buttons cannot be added after datatable is already initialized.";
        }

        if (respite_crud.dt_Buttons == undefined) {
            respite_crud.dt_Buttons = [];
        }

        respite_crud.dt_Buttons.push(objButton);

        // if datatable is already initialized, add using api
        if (respite_crud.dt != undefined) {
            respite_crud.dt.button().add(respite_crud.dt_Buttons.length, objButton);
        }

        // return self to allow chaining
        return respite_crud;
    }

    static addAddButton(title, glyph, customClass) {
        return respite_crud.addToolbarActionButton(
            {
                text: (glyph == undefined || glyph == null ? '<i class="fas fa-plus"></i>' : '<i class="' + glyph + '"></i> ') + (title == undefined || title == null ? "Add" : title),
                className: (customClass == undefined || customClass == null ? "btn btn-success btn-sm" : customClass),
                action: function (e, dt, node, config) {
                    respite_crud.showDMModal(null, "add");
                }
            });
    }
    static addRefreshButton(title, glyph, customClass) {
        return respite_crud.addToolbarActionButton(
            {
                text: (glyph == undefined || glyph == null ? '<i class="fas fa-sync-alt"></i> ' : '<i class="' + glyph + '"></i> ') + (title == undefined || title == null ? "Refresh" : title),
                className: (customClass == undefined || customClass == null ? "btn btn-primary btn-sm" : customClass),
                action: function (e, dt, node, config) {
                    dt.ajax.reload();
                }
            });
    }
    static addSelectAllButton(title, glyph, customClass) {
        return respite_crud.addToolbarActionButton(
            {
                text: (glyph == undefined || glyph == null ? '<i class="far fa-check-circle"></i> ' : '<i class="' + glyph + '"></i> ') + (title == undefined || title == null ? 'Select All' : title),
                className: (customClass == undefined || customClass == null ? "btn btn-default btn-sm" : customClass),
                action: function (e, dt, node, config) {
                    dt.rows().select();
                }
            });
    }
    static addDeSelectAllButton(title, glyph, customClass) {
        return respite_crud.addToolbarActionButton(
            {
                text: (glyph == undefined || glyph == null ? '<i class="far fa-circle"></i> ' : '<i class="' + glyph + '"></i> ') + (title == undefined || title == null ? 'De-Select All' : title),
                className: (customClass == undefined || customClass == null ? "btn btn-default btn-sm" : customClass),
                action: function (e, dt, node, config) {
                    dt.rows().deselect();
                }
            });
    }
    static addDeleteSelectedButton(title, glyph, customClass) {
        return respite_crud.addToolbarActionButton(
            {
                text: (glyph == undefined || glyph == null ? '<i class="fas fa-trash-alt"></i> ' : '<i class="' + glyph + '"></i> ') + (title == undefined || title == null ? 'Delete Selected' : title),
                className: (customClass == undefined || customClass == null ? "btn btn-danger btn-sm" : customClass),
                action: respite_crud.showDeleteMultiple
            });
    }
    static addExportButton(title, glyph, customClass) {
        return respite_crud.addToolbarActionButton(
            {
                extend: 'collection',
                text: (glyph == undefined || glyph == null ? '<i class="fas fa-download"></i> ' : '<i class="' + glyph + '"></i> ') + (title == undefined || title == null ? 'Export' : title),
                className: (customClass == undefined || customClass == null ? "btn btn-dark btn-sm" : customClass),
                buttons: [
                    {
                        extend: 'copy',
                        exportOptions: {
                            columns: '.dt-exportable'
                        }
                    },
                    {
                        extend: 'excel',
                        exportOptions: {
                            columns: '.dt-exportable'
                        }
                    },
                    {
                        extend: 'csv',
                        exportOptions: {
                            columns: '.dt-exportable'
                        }
                    },
                    {
                        extend: 'pdf',
                        exportOptions: {
                            columns: '.dt-exportable'
                        }
                    },
                    {
                        extend: 'print',
                        exportOptions: {
                            columns: '.dt-exportable'
                        }
                    }
                ]
            });
    }
    static addToggleColumnsButton(title, glyph, customClass) {
        return respite_crud.addToolbarActionButton(
            {
                extend: 'collection',
                text: (glyph == undefined || glyph == null ? '<i class="fas fa-eye"></i> ' : '<i class="' + glyph + '"></i> ') + (title == undefined || title == null ? 'Toggle Columns' : title),
                className: (customClass == undefined || customClass == null ? "btn btn-warning btn-sm" : customClass),
                buttons: [
                    { extend: 'columnsVisibility', columns: ['.dt-toggleable'] }
                ],
                visibility: true
            });
    }

    //// Add Columns ////
    static addColumn(objColumn) {
        if (respite_crud.dt != undefined) {
            throw "Error: New columns cannot be added after the datatable is already initialized!";
        }

        if (respite_crud.dt_Columns == undefined) {
            respite_crud.dt_Columns = []
        }

        respite_crud.dt_Columns.push(objColumn);

        return respite_crud;
    }

    static addInlineActionButtonsColumn() {
        return respite_crud.addColumn({
            "class": "actions-control",
            "orderable": false,
            "searchable": false,
            "data": null,
            "render": respite_crud.renderInlineActionButtons
        });
    }

    //// Set Columns Order ////
    static setColumnsOrder(options) {
        respite_crud.dt_Order = options;

        // return self to allow chaining
        return respite_crud;
    }

    //// Initialize DataTable ////
    static initDataTable(options) {
        // prepare default options
        respite_crud.setEditorOptions();

        // defaults
        if (respite_crud.dt_Order == undefined)
            respite_crud.dt_Order = [];

        if (respite_crud.dt_Buttons == undefined)
            respite_crud.dt_Buttons = [];

        var setOptions = {
            "processing": true,
            "serverSide": true,
            "deferRender": true,
            "scrollCollapse": true,
            "ajax": {
                url: respite_crud.respite_editor_options.dt_Options.dt_AjaxGet,
                type: 'POST'
            },
            "columns": respite_crud.dt_Columns,
            "order": respite_crud.dt_Order,

            //// Scroller Extension: //// remove or comment out this option to disable scroller and bring back pagination buttons
            //"scroller": {
            //    loadingIndicator: true
            //},

            //// Select Extension: //// remove or comment out this option to disable the select extension
            "select": 'os',

            //// Pagination: ////
            //"scrollX": 460,
            //"scrollY": 390,
            "lengthChange": true,           // allows users to change number of items visible in table (page size)
            "pagingType": "simple_numbers", // pagination type https://datatables.net/reference/option/pagingType
            "searchDelay": 700,

            //// DOM setting: //// more info here: https://datatables.net/reference/option/dom
            "dom": "Bilfpr<'table-responsive't>p", // TODO: the B section should only be added if toolbar buttons were added

            //// Custom Buttons: ////
            "buttons": respite_crud.dt_Buttons,
            "initComplete": function () {
                // save footer
                var footerBefore = $(respite_crud.respite_editor_options.dt_Options.dt_Selector + ' tfoot tr').clone(true);

                // dropdown filters:
                this.api().columns('.dt-searchable-dropdown').every(function () {
                    var column = this;
                    var select = $('<select class="form-control"><option value="" style="font-weight: bold;">Search</option></select>')
                        .appendTo($(column.footer()).empty())
                        .on('change', function () {
                            var val = $.fn.dataTable.util.escapeRegex(
                                $(this).val()
                            );

                            column
                                .search(val ? val : '', true, false)
                                .draw();
                        });

                    for (var i = 0; respite_crud.dt_Columns[column[0]]['editor_data'] != undefined && respite_crud.dt_Columns[column[0]].editor_data['options'] != undefined && i < respite_crud.dt_Columns[column[0]].editor_data['options']['length']; i++) {
                        var d = respite_crud.dt_Columns[column[0]].editor_data['options'][i];
                        var val = $.fn.dataTable.util.escapeRegex(d.value);
                        if (column.search() === val) {
                            select.append(
                              '<option value="' + val + '" selected="selected">' + d.label + "</option>"
                            );
                        } else {
                            select.append('<option value="' + val + '">' + d.label + "</option>");
                        }
                    }
                });
                // textual filters
                this.api().columns('.dt-searchable-text').every(function () {
                    var column = this;
                    var txt = $('<input type="search" class="form-control" placeholder="Search" />')
                        .appendTo($(column.footer()).empty())
                        .val(column.search().replace("%", "").replace("%", ""))
                        .on('change', function () {
                            var val = $.fn.dataTable.util.escapeRegex(
                                $(this).val()
                            );

                            column
                                .search(val ? '%' + val + '%' : '', true, false)
                                .draw();
                        });
                });
                // Copy footers to right below headers
                $(respite_crud.respite_editor_options.dt_Options.dt_Selector + ' tfoot tr').clone(true).appendTo(respite_crud.respite_editor_options.dt_Options.dt_Selector + ' thead');
                $(respite_crud.respite_editor_options.dt_Options.dt_Selector + ' thead tr:eq(1) th.dt-non-searchable').empty();

                // Reset footers
                $(respite_crud.respite_editor_options.dt_Options.dt_Selector + ' tfoot').empty();
                footerBefore.appendTo(respite_crud.respite_editor_options.dt_Options.dt_Selector + ' tfoot.dt-keep-footer');
            }
        }

        // apply option overrides
        if (options != undefined) {
            for (var key in options) {
                setOptions[key] = options[key];
            }
        }

        if (setOptions.buttons.length <= 0) {
            setOptions.dom = setOptions.dom.replace("B", "");
        }
        console.log("initializing datatable. options:");
        console.log(setOptions);
        //console.log($(respite_crud.respite_editor_options.dt_Options.dt_Selector));

        $(document).ready(function () {
            //console.log(setOptions);
            //console.log(respite_crud.respite_editor_options.dt_Options.dt_Selector);
            respite_crud.dt = $(respite_crud.respite_editor_options.dt_Options.dt_Selector).DataTable(setOptions);

            if (respite_crud.isDetailRowsAdded) {
                // On each draw, loop over the `detailRows` array and show any child rows
                respite_crud.dt.on('draw', function () {
                    $.each(respite_crud.detailRows, function (i, id) {
                        $('#' + id + ' td a.details-control').trigger('click');
                    });
                });

            }
        });
    }
}