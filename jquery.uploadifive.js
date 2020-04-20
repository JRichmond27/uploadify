/*!
UploadiFive 1.2.3
Copyright (c) 2012 Reactive Apps, Ronnie Garcia
Released under the UploadiFive Commercial License <http://www.uploadify.com/download/download-uploadifive-commercial/>
Fixes by Andrew Koransky / InfoTank, Inc. - first fix is the line above.  I bought the commercial license not the Standard license.  Search for "ASK - FIX" for my fixes.
Additional Fixes by Jeff Richmond - Search for "JR - FIX" for my fixes and optimizations.
*/

//JR - FIX: Added console logging for debugging throughout
const DEBUG_UL5 = true;

(function($) {
    var methods = {

        init: function (options)
        {
            if (DEBUG_UL5) console.log('%cinit', LOG_START); //JR - FIX: Debug logging
            return this.each(function ()
            {

                // Create a reference to the jQuery DOM object
                var $this = $(this);
                $this.data('uploadifive', {
                    inputs: {}, // The object that contains all the file inputs
                    inputCount: 0,  // The total number of file inputs created
                    fileID: 0,
                    queue: {
                        count: 0, // Total number of files in the queue
                        selected: 0, // Number of files selected in the last select operation
                        replaced: 0, // Number of files replaced in the last select operation
                        errors: 0, // Number of files that returned an error in the last select operation
                        queued: 0, // Number of files added to the queue in the last select operation
                        cancelled: 0  // Total number of files that have been canceled or removed from the queue
                    },
                    checking: 0, //JR - FIX: Number of files currently being checked
                    uploads: {
                        current: 0, // Number of files currently being uploaded
                        attempts: 0, // Number of file uploads attempted in the last upload operation
                        successful: 0, // Number of files successfully uploaded in the last upload operation
                        errors: 0, // Number of files returning errors in the last upload operation
                        count: 0  // Total number of files uploaded successfully
                    }
                });
                var $data = $this.data('uploadifive');

                // Set the default options
                var settings = $data.settings = $.extend({
                    'auto': true,               // Automatically upload a file when it's added to the queue
                    'buttonClass': false,              // A class to add to the UploadiFive button
                    'buttonText': 'Select Files',     // The text that appears on the UploadiFive button
                    'checkScript': false,              // Path to the script that checks for existing file names 
                    'dnd': true,               // Allow drag and drop into the queue
                    'dropTarget': false,              // Selector for the drop target
                    'fileObjName': 'Filedata',         // The name of the file object to use in your server-side script
                    'fileSizeLimit': 0,                  // Maximum allowed size of files to upload
                    'fileType': false,              // Type of files allowed (image, etc), separate with a pipe character |
                    'formData': {},                 // Additional data to send to the upload script
                    'height': 30,                 // The height of the button
                    'itemTemplate': false,              // The HTML markup for the item in the queue
                    'method': 'post',             // The method to use when submitting the upload
                    'multi': true,               // Set to true to allow multiple file selections
                    'overrideEvents': [],                 // An array of events to override
                    'queueID': false,              // The ID of the file queue
                    'queueSizeLimit': 0,                  // The maximum number of files that can be in the queue
                    'removeCompleted': false,              // Set to true to remove files that have completed uploading
                    'simUploadLimit': 0,                  // The maximum number of files to upload at once
                    'truncateLength': 0,                  // The length to truncate the file names to
                    'uploadLimit': 0,                  // The maximum number of files you can upload
                    'uploadScript': 'uploadifive.php',  // The path to the upload script
                    'width': 100                 // The width of the button

                    /* JR - FIX BEGIN: New image resizing settings */,
                    'compressImages': true,         // Attempt to compress images on upload
                    'imageQuality': 0.95,             // Target quality for compressed images
                    'imageMaxWidth': 2880,          // Maximum width to resize large images to
                    'imageMaxHeight': 2880,         // Maximum height to resize large images to
                    'imageMaxPNGSize': 1000000      // Maximum file size (in bytes) for PNG images befor converting to JPG
                    /* JR - FIX END */

                    /*
                    // Events
                    'onAddQueueItem'   : function(file) {},                        // Triggered for each file that is added to the queue
                    'onCancel'         : function(file) {},                        // Triggered when a file is cancelled or removed from the queue
                    'onCheck'          : function(file, exists) {},                // Triggered when the server is checked for an existing file
                    'onClearQueue'     : function(queue) {},                       // Triggered during the clearQueue function
                    'onDestroy'        : function() {}                             // Triggered during the destroy function
                    'onDrop'           : function(files, numberOfFilesDropped) {}, // Triggered when files are dropped into the file queue
                    'onError'          : function(file, fileType, data) {},        // Triggered when an error occurs
                    'onFallback'       : function() {},                            // Triggered if the HTML5 File API is not supported by the browser
                    'onInit'           : function() {},                            // Triggered when UploadiFive if initialized
                    'onQueueComplete'  : function() {},                            // Triggered once when an upload queue is done
                    'onProgress'       : function(file, event) {},                 // Triggered during each progress update of an upload
                    'onSelect'         : function() {},                            // Triggered once when files are selected from a dialog box
                    'onUpload'         : function(file) {},                        // Triggered when an upload queue is started
                    'onUploadComplete' : function(file, data) {},                  // Triggered when a file is successfully uploaded
                    'onUploadFile'     : function(file) {},                        // Triggered for each file being uploaded
                    */
                }, options);

                // Create an array of file types
                var file_types;
                if (settings.fileType)
                {
                    file_types = settings.fileType.split('|');
                }

                // Calculate the file size limit
                if (isNaN(settings.fileSizeLimit))
                {
                    var fileSizeLimitBytes = parseInt(settings.fileSizeLimit, 10) * 1.024;
                    if (settings.fileSizeLimit.indexOf('KB') > -1)
                    {
                        settings.fileSizeLimit = fileSizeLimitBytes * 1000;
                    } else if (settings.fileSizeLimit.indexOf('MB') > -1)
                    {
                        settings.fileSizeLimit = fileSizeLimitBytes * 1000000;
                    } else if (settings.fileSizeLimit.indexOf('GB') > -1)
                    {
                        settings.fileSizeLimit = fileSizeLimitBytes * 1000000000;
                    }
                } else
                {
                    settings.fileSizeLimit = settings.fileSizeLimit * 1024;
                }

                // Create a template for a file input
                $data.inputTemplate = $('<input type="file">');
                // JR - FIX: Leave this to the stylesheet. That's what it's for.
                //.css({
                //    'font-size' : settings.height + 'px',
                //    'opacity'   : 0,
                //    'position'  : 'absolute',
                //    'right'     : '-3px',
                //    'top'       : '-3px',
                //    'z-index'   : 999 
                //});

                // Create a new input
                $data.createInput = function ()
                {
                    if (DEBUG_UL5) console.log('%ccreateInput', LOG_START); //JR - FIX: Debug logging

                    /* JR - FIX BEGIN: Renamed input variable to $input to make it clear that it's a jquery object */
                    // Create a clone of the file input
                    var $input = $data.inputTemplate.clone();
                    // Create a unique name for the input item
                    var inputName = $input.name = 'input' + $data.inputCount++;
                    // JR - FIX: added unique ID to each input element
                    $input.attr('id', inputName);
                    // Set the multiple attribute
                    if (settings.multi)
                    {
                        $input.attr('multiple', true);
                    }
                    // Set the accept attribute on the input
                    if (settings.fileType)
                    {
                        $input.attr('accept', settings.fileType);
                    }
                    // Set the onchange event for the input
                    $input.bind('change', function ()
                    {
                        if (DEBUG_UL5) console.log('%cinput_change', LOG_START); //JR - FIX: Debug logging
                        $data.queue.selected = 0;
                        $data.queue.replaced = 0;
                        $data.queue.errors = 0;
                        $data.queue.queued = 0;

                        // Add a queue item to the queue for each file
                        var limit = this.files.length;
                        $data.queue.selected = limit;

                        // Check if the queue size limit will be exceeded
                        if (($data.queue.count + limit) > settings.queueSizeLimit && settings.queueSizeLimit !== 0)
                        {
                            if ($.inArray('onError', settings.overrideEvents) < 0)
                            {
                                alert('The maximum number of queue items has been reached (' + settings.queueSizeLimit + ').  Please select fewer files.');
                            }
                            // Trigger the error event
                            if (typeof settings.onError === 'function')
                            {
                                settings.onError.call($this, 'QUEUE_LIMIT_EXCEEDED');
                            }
                        } else
                        {
                            // Add each file to the queue
                            for (var n = 0; n < limit; n++)
                            {
                                file = this.files[n];
                                $data.addQueueItem(file);
                            }
                            // Add the current file input to the input array
                            $data.inputs[inputName] = this;

                            // Create the next file input
                            $data.createInput();
                        }
                        // Upload the file if auto-uploads are enabled
                        if (settings.auto)
                        {
                            methods.upload.call($this);
                        }
                        // Trigger the select event
                        if (typeof settings.onSelect === 'function')
                        {
                            settings.onSelect.call($this, $data.queue);
                        }
                    });
                    // Hide the existing current item and add the new one
                    if ($data.currentInput)
                    {
                        $data.currentInput.hide();
                    }
                    $data.button.append($input);
                    $data.currentInput = $input;
                    /* JR - FIX END */
                };

                // Remove an input
                $data.destroyInput = function (key)
                {
                    // Remove the file input element from the page
                    $($data.inputs[key]).remove();
                    // Remove the specified file input from the input array
                    delete $data.inputs[key];
                    $data.inputCount--;
                };

                // JR - FIX BEGIN - clean up unnecessary file inputs
                $data.cleanInputs = function ()
                {
                    for (var key in $data.inputs)
                    {
                        var input = $data.inputs[key];
                        var intTotal = input.files.length;
                        var intSkipped = 0;
                        for (var i = 0; i < intTotal; i++)
                        {
                            // Count the skipped files
                            if (input.files[i].skip) intSkipped++;
                        }
                        if (intSkipped >= intTotal) $data.destroyInput(key);
                    }
                };
                // JR - FIX END

                // Drop a file into the queue
                $data.drop = function (e)
                {
                    // Stop FireFox from opening the dropped file(s)
                    e.preventDefault();
                    e.stopPropagation();

                    /* ASK - FIX BEGIN */
                    if ((navigator.userAgent.toLowerCase().indexOf("safari/") !== -1) && (navigator.userAgent.toLowerCase().indexOf("windows") !== -1) && (navigator.userAgent.toLowerCase().indexOf("chrome") === -1))
                    {
                        alert('Drag and drop in Safari on windows is not supported.');
                        return;
                    }
                    /* ASK - FIX END */

                    $data.queue.selected = 0;
                    $data.queue.replaced = 0;
                    $data.queue.errors = 0;
                    $data.queue.queued = 0;

                    var fileData = e.dataTransfer;
                    var inputName = fileData.name = 'input' + $data.inputCount++;

                    // Add a queue item to the queue for each file
                    var limit = fileData.files.length;
                    $data.queue.selected = limit;

                    // Check if the queue size limit will be exceeded
                    if (($data.queue.count + limit) > settings.queueSizeLimit && settings.queueSizeLimit !== 0)
                    {
                        // Check if the queueSizeLimit was reached
                        if ($.inArray('onError', settings.overrideEvents) < 0)
                        {
                            alert('The maximum number of queue items has been reached (' + settings.queueSizeLimit + ').  Please select fewer files.');
                        }
                        // Trigger the onError event
                        if (typeof settings.onError === 'function')
                        {
                            settings.onError.call($this, 'QUEUE_LIMIT_EXCEEDED');
                        }
                    }
                    else
                    {
                        /* ASK - FIX BEGIN */
                        var newInput = {};
                        //newInput.name = new String(fileData.name);
                        newInput.name = fileData.name;
                        newInput.files = jQuery.extend(true, {}, fileData.files);
                        // Add a queue item for each file
                        for (var n = 0; n < limit; n++)
                        {
                            file = fileData.files[n];
                            $data.addQueueItem(newInput.files[n]);
                            if (file_types && file_types.indexOf(file.type) === -1)
                            {
                                $data.error('FORBIDDEN_FILE_TYPE', file);
                            }
                        }
                        // Save the data to the inputs object
                        $data.inputs[inputName] = newInput;
                        /* ASK - FIX END */
                    }

                    // Upload the file if auto-uploads are enabled
                    if (settings.auto)
                    {
                        methods.upload.call($this);
                    }

                    // Trigger the onDrop event
                    if (typeof settings.onDrop === 'function')
                    {
                        settings.onDrop.call($this, fileData.files, fileData.files.length);
                    }
                };

                // Check if a filename exists in the queue
                $data.fileExistsInQueue = function (file)
                {
                    for (var key in $data.inputs)
                    {
                        input = $data.inputs[key];
                        limit = input.files.length;
                        for (var n = 0; n < limit; n++)
                        {
                            existingFile = input.files[n];
                            // Check if the filename matches
                            if (existingFile.name === file.name && !existingFile.complete)
                            {
                                return true;
                            }
                        }
                    }
                    return false;
                };

                // Remove an existing file in the queue
                $data.removeExistingFile = function (file)
                {
                    for (var key in $data.inputs)
                    {
                        input = $data.inputs[key];
                        limit = input.files.length;
                        for (var n = 0; n < limit; n++)
                        {
                            existingFile = input.files[n];
                            // Check if the filename matches
                            if (existingFile.name === file.name && !existingFile.complete)
                            {
                                $data.queue.replaced++;
                                methods.cancel.call($this, existingFile, true);
                            }
                        }
                    }
                };

                // Create the file item template
                if (settings.itemTemplate === false)
                {
                    /*jshint multistr: true */
                    /* JR - FIX BEGIN - Restructured queue item to display file info better */
                    $data.queueItem = $('<div class="uploadifive-queue-item">\
                        <a class="close" href="#" title="Remove this upload">Remove</a>\
                        <div><span class="filename"></span> <span class="filesize"></span> <span class="filestatus"></span></div>\
                        <div class="progress">\
                            <div class="progress-bar"></div>\
                        </div>\
                    </div>');
                    /* JR - FIX END */

                } else
                {
                    $data.queueItem = $(settings.itemTemplate);
                }

                // Add an item to the queue
                $data.addQueueItem = function (file)
                {
                    if (DEBUG_UL5) console.log('%caddQueueItem: ' + file.name, LOG_START); //JR - FIX: Debug logging
                    if ($.inArray('onAddQueueItem', settings.overrideEvents) < 0)
                    {
                        // Check if the filename already exists in the queue
                        $data.removeExistingFile(file);
                        // Create a clone of the queue item template
                        file.queueItem = $data.queueItem.clone();
                        // Add an ID to the queue item
                        file.queueItem.attr('id', settings.id + '-file-' + $data.fileID++);
                        // Bind the close event to the close button
                        file.queueItem.find('.close').bind('click', function ()
                        {
                            methods.cancel.call($this, file);
                            return false;
                        });
                        var fileName = file.name;
                        if (fileName.length > settings.truncateLength && settings.truncateLength !== 0)
                        {
                            // JR - FIX: changed ... to &hellip;
                            fileName = '<span title="' + fileName + '">' + fileName.substring(0, settings.truncateLength) + '&hellip;</span>';
                        }
                        // JR - FIX added canceled data value
                        file.queueItem.data('canceled', false);
                        // JR - FIX: moved file size separate element to match updated queue template
                        file.queueItem.find('.filename').html(fileName);
                        file.queueItem.find('.filesize').html(' (' + filesize(file.size) + ')');
                        // Add a reference to the file
                        file.queueItem.data('file', file);
                        $data.queueEl.append(file.queueItem);
                    }
                    // JR - FIX: moved addQueueItem event trigger to the end so that queue counts are accurate
                    // Check the filesize
                    if (file.size > settings.fileSizeLimit && settings.fileSizeLimit !== 0)
                    {
                        $data.error('FILE_SIZE_LIMIT_EXCEEDED', file);
                    } else
                    {
                        $data.queue.queued++;
                        $data.queue.count++;
                    }
                    // Trigger the addQueueItem event
                    if (typeof settings.onAddQueueItem === 'function')
                    {
                        settings.onAddQueueItem.call($this, file);
                    }
                    /* JR - FIX END */
                };

                // Remove an item from the queue
                $data.removeQueueItem = function (file, instant, delay)
                {
                    if (DEBUG_UL5) console.log('%cremoveQueueItem: ' + file.name, LOG_TEXT); //JR - FIX: Debug logging
                    // Set the default delay
                    if (!delay) delay = 0;
                    var fadeTime = instant ? 0 : 500;
                    if (file.queueItem)
                    {
                        // JR - FIX added canceled data value so the item is flagged until the fade out animation completes
                        file.queueItem.data('canceled', true);

                        // JR - FIX changed class name to match updated queue template
                        if (file.queueItem.find('.filestatus').html() !== 'Completed')
                        {
                            file.queueItem.find('.filestatus').html('Cancelled');
                        }
                        file.queueItem.find('.progress-bar').width(0);
                        file.queueItem.delay(delay).fadeOut(fadeTime, function ()
                        {
                            $(this).remove();
                        });
                        delete file.queueItem;
                        $data.queue.count--;
                    }
                };

                // Count the number of files that need to be uploaded
                $data.filesToUpload = function ()
                {
                    var filesToUpload = 0;
                    for (var key in $data.inputs)
                    {
                        input = $data.inputs[key];
                        limit = input.files.length;
                        for (var n = 0; n < limit; n++)
                        {
                            file = input.files[n];
                            if (!file.skip && !file.complete)
                            {
                                filesToUpload++;
                            }
                        }
                    }
                    if (DEBUG_UL5) console.log('%cfilesToUpload: ' + filesToUpload, LOG_TEXT); //JR - FIX: Debug logging
                    return filesToUpload;
                };

                // Check if a file exists
                $data.checkExists = function (file, blnStartUpload)
                {
                    if (DEBUG_UL5) console.log('%ccheckExists: ' + file.name, LOG_START); //JR - FIX: Debug logging
                    /* JR - FIX BEGIN: remove synchronous AJAX check by using callbacks instead */
                    if (typeof file.checkStarted === 'undefined' || !file.checkStarted)
                    {
                        file.checkStarted = true;
                        file.checked = false;
                        $data.checking++;

                        if ($.inArray('onCheck', settings.overrideEvents) < 0)
                        {
                            // Send the filename to the check script
                            var checkData = $.extend(settings.formData, { filename: file.name });
                            /* ASK - FIX BEGIN */
                            $.post(settings.checkScript, checkData, function (response)
                            {
                                if (response.lastIndexOf("error:", 0) !== 0)
                                {
                                    file.exists = parseInt(response, 10);
                                    file.checked = true;
                                } else
                                {
                                    alert('An error occurred while checking if the file already exists:\n' + response);
                                }
                                if (file.exists)
                                {
                                    if (DEBUG_UL5) console.log('%ccheckExists - File exists: ' + file.name, LOG_IMPORTANT); //JR - FIX: Debug logging
                                    /* JR - FIX: Build the response to work in more situations */
                                    var strMessage = '';
                                    if (settings.multi)
                                        strMessage = 'The file you\'re uploading (' + file.name + ') already exists.\nWould you like to replace it?';
                                    else
                                        strMessage = 'The file you\'re uploading already exists.\nWould you like to replace it?'
                                    /* JR - FIX END */
                                    // Ask the user if the existing file should be replaced
                                    if (confirm(strMessage))
                                    {
                                        file.skip = false;
                                    }
                                    else
                                    {
                                        // If not replacing the file, cancel the upload
                                        methods.cancel.call($this, file);
                                        file.skip = true;
                                    }
                                }
                                else
                                {
                                    if (DEBUG_UL5) console.log('%ccheckExists - New file: ' + file.name, LOG_INFO); //JR - FIX: Debug logging
                                    file.skip = false;
                                }

                                $data.checking--;

                                // Start the upload if necessary
                                if (blnStartUpload && !file.skip) $data.startFileUpload(file);

                                // Trigger the check event
                                if (typeof settings.onCheck === 'function')
                                {
                                    settings.onCheck.call($this, file, file.exists);
                                }
                            });
                            /* ASK - FIX END */
                        }
                    }
                    else
                    {
                        if (DEBUG_UL5) console.log('%ccheckExists - File already checked: ' + file.name, LOG_TEXT); //JR - FIX: Debug logging

                        // Start the upload if necessary
                        if (file.checked && !file.skip && blnStartUpload) $data.startFileUpload(file);
                    }
                    /* JR - FIX END */
                };
                
                /* JR - FIX BEGIN: moved this from method.upload to it's own function so that it can be used as a callback when the file check returns */
                $data.startFileUpload = function (_file)
                {
                    if (DEBUG_UL5) console.log('%cstartFileUpload: ' + _file.name, LOG_START); //JR - FIX: Debug logging

                    // Check if the simUpload limit was reached
                    var intLimit = settings.UploadLimit;
                    var intSimLimit = settings.simUploadLimit;
                    var intCurrent = $data.uploads.current;
                    var intCount = $data.uploads.count;
                    if ((intCurrent >= intSimLimit && intSimLimit !== 0) || (intCurrent >= intLimit && intLimit !== 0) || (intCount >= intLimit && intLimit !== 0))
                    {
                        if (DEBUG_UL5) //JR - FIX: Debug logging
                        {
                            console.log('%cstartFileUpload - Queue limit reached: ' + $(this).data('file').name, LOG_IMPORTANT);
                            console.log('%c    limit: ' + intLimit + '\n    sim limit: ' + intSimLimit + '\n    uploading: ' + intCurrent + '\n    uploads: ' + intCount, LOG_TEXT);
                        }
                        return false;
                    }
                    if (!_file.skip && !_file.uploading && !_file.complete) //JR - FIX: uploadFile was being called for files that were already uploading or completed. Not the end of the world, but not necessary
                    {
                        //if (DEBUG_UL5) console.log('%cupload file: ' + _file.name, LOG_TEXT); //JR - FIX: Debug logging
                        $data.uploadFile(_file, true);
                    }
                };
                /* JR - FIX END */

                // Upload a single file
                $data.uploadFile = function (file, uploadAll)
                {
                    if (DEBUG_UL5) console.log('%cuploadFile: ' + file.name, LOG_START); //JR - FIX: Debug logging
                    if (!file.skip && !file.uploading && !file.complete)
                    {
                        file.uploading = true;
                        $data.uploads.current++;
                        $data.uploads.attempted++;

                        // Create a new AJAX request
                        xhr = file.xhr = new XMLHttpRequest();

                        // Start the upload
                        // Use the faster FormData if it exists
                        if (typeof FormData === 'function' || typeof FormData === 'object')
                        {
                            // Create a new FormData object
                            var formData = new FormData();

                            /* JR - FIX BEGIN: Automatically optimize images before they're uploaded */
                            if (DEBUG_UL5) console.log('%cFile Type: ' + file.type, LOG_INFO); //JR - FIX: Debug logging

                            if (settings.compressImages && (file.type === 'image/jpeg' || file.type === 'image/png'))
                            {
                                if (DEBUG_UL5) console.log('%cCompress Image (' + settings.imageQuality + ')', LOG_START); //JR - FIX: Debug logging

                                // Resizing starts
                                new Compressor(file,
                                    {
                                        quality: settings.imageQuality,
                                        maxWidth: settings.imageMaxWidth,
                                        maxHeight: settings.imageMaxHeight,
                                        convertSize: settings.imageMaxPNGSize,
                                        success: function (resized)
                                        {
                                            if (DEBUG_UL5) console.log('%cCompression Complete: ' + file.size + '->' + resized.size + ' ' + resized.type, LOG_SUCCESS); //JR - FIX: Debug logging

                                            // Copy existing file attributes to new resized blob
                                            resized.checkStarted = file.checkStarted;
                                            resized.checked = file.checked;
                                            resized.complete = file.complete;
                                            resized.exists = file.exists;
                                            resized.lastModifiedDate = new Date();
                                            resized.queueItem = file.queueItem;
                                            resized.skip = file.skip;
                                            resized.uploading = file.uploading;
                                            resized.xhr = file.xhr;

                                            // Replace the existing file with the new blob
                                            file = resized;

                                            // Append resized blob into form data with file name
                                            formData.append(settings.fileObjName, file, file.name);

                                            // Add the rest of the formData
                                            /* JR - FIX BEGIN: when uploading multiple files, the file name was not updated properly, so all files got the same name
                                               whatever is in formData for the filename doesn't change for some reason, so it has to be replaced with the actual file name
                                               TODO: find out why the filename isn't set properly */
                                            var blnFilenameSet = false;
                                            for (var i in settings.formData)
                                            {
                                                if (i === 'filename')
                                                {
                                                    formData.append('filename', file.name);
                                                    blnFilenameSet = true;
                                                }
                                                else
                                                {
                                                    formData.append(i, settings.formData[i]);
                                                }
                                            }
                                            if (!blnFilenameSet) formData.append('filename', file.name);
                                            /* JR - FIX END */

                                            // Open the AJAX call
                                            xhr.open(settings.method, settings.uploadScript, true);

                                            // On progress function
                                            xhr.upload.addEventListener('progress', function (e)
                                            {
                                                if (e.lengthComputable)
                                                {
                                                    $data.progress(e, file);
                                                }
                                            }, false);

                                            // On complete function
                                            xhr.addEventListener('load', function (e)
                                            {
                                                if (this.readyState === 4)
                                                {
                                                    file.uploading = false;
                                                    if (this.status === 200)
                                                    {
                                                        if (file.xhr.responseText.lastIndexOf("error:", 0) !== 0)
                                                        { /* ASK - FIX: a more generic approach.  adjust upload script accordingly */
                                                            $data.uploadComplete(e, file, uploadAll);
                                                        } else
                                                        {
                                                            $data.error(file.xhr.responseText, file, uploadAll); /* ASK - FIX */
                                                        }
                                                    } else if (this.status === 404)
                                                    {
                                                        console.log('%cError: ' + this.statusText, LOG_ERROR); //JR - FIX: log the full response status
                                                        $data.error('404_FILE_NOT_FOUND', file, uploadAll);
                                                    } else if (this.status === 403)
                                                    {
                                                        console.log('%cError: ' + this.statusText, LOG_ERROR); //JR - FIX: log the full response status
                                                        $data.error('403_FORBIDDEN', file, uploadAll);
                                                    } else
                                                    {
                                                        $data.error('Error:' + file.xhr.responseText, file, uploadAll); /* ASK - FIX */
                                                    }
                                                }
                                            });

                                            // Send the form data (multipart/form-data)
                                            xhr.send(formData);
                                        },
                                        error: function (err)
                                        {
                                            console.log('%cError: ' + err.message, LOG_ERROR);
                                        }
                                    });
                            }
                            else
                            {
                                if (DEBUG_UL5) console.log('%cStart Upload: ' + file.name + ' (' + file.size + ')', LOG_START); //JR - FIX: Debug logging

                                // Add the form data
                                formData.append(settings.fileObjName, file);

                                // Add the rest of the formData
                                /* JR - FIX BEGIN: when uploading multiple files, the file name was not updated properly, so all files got the same name
                                   whatever is in formData for the filename doesn't change for some reason, so it has to be replaced with the actual file name
                                   TODO: find out why the filename isn't set properly */
                                var blnFilenameSet = false;
                                for (var i in settings.formData)
                                {
                                    if (i === 'filename')
                                    {
                                        formData.append('filename', file.name);
                                        blnFilenameSet = true;
                                    }
                                    else
                                    {
                                        formData.append(i, settings.formData[i]);
                                    }
                                }
                                if (!blnFilenameSet) formData.append('filename', file.name);
                                /* JR - FIX END */

                                // Open the AJAX call
                                xhr.open(settings.method, settings.uploadScript, true);
                                // On progress function
                                xhr.upload.addEventListener('progress', function (e)
                                {
                                    if (e.lengthComputable)
                                    {
                                        $data.progress(e, file);
                                    }
                                }, false);

                                // On complete function
                                xhr.addEventListener('load', function (e)
                                {
                                    if (this.readyState === 4)
                                    {
                                        file.uploading = false;
                                        if (this.status === 200)
                                        {
                                            if (file.xhr.responseText.lastIndexOf("error:", 0) !== 0)
                                            { /* ASK - FIX: a more generic approach.  adjust upload script accordingly */
                                                $data.uploadComplete(e, file, uploadAll);
                                            } else
                                            {
                                                $data.error(file.xhr.responseText, file, uploadAll); /* ASK - FIX */
                                            }
                                        } else if (this.status === 404)
                                        {
                                            console.log('%cError: ' + this.statusText, LOG_ERROR); //JR - FIX: log the full response status
                                            $data.error('404_FILE_NOT_FOUND', file, uploadAll);
                                        } else if (this.status === 403)
                                        {
                                            console.log('%cError: ' + this.statusText, LOG_ERROR); //JR - FIX: log the full response status
                                            $data.error('403_FORBIDDEN', file, uploadAll);
                                        } else
                                        {
                                            $data.error('Error:' + file.xhr.responseText, file, uploadAll);/* ASK - FIX */
                                        }
                                    }
                                });

                                // Send the form data (multipart/form-data)
                                xhr.send(formData);
                            }
                            /* JR - FIX END */
                        } else
                        {
                            if (DEBUG_UL5) console.log('%cbinary upload: ' + file.name, LOG_TEXT); //JR - FIX: Debug logging
                            // Send as binary
                            var reader = new FileReader();
                            reader.onload = function (e)
                            {

                                // Set some file builder variables
                                var boundary = '-------------------------' + (new Date()).getTime(),
                                    dashes = '--',
                                    eol = '\r\n',
                                    binFile = '';

                                // Build an RFC2388 String 
                                binFile += dashes + boundary + eol;
                                // Generate the headers
                                binFile += 'Content-Disposition: form-data; name="' + settings.fileObjName + '"';
                                if (file.name)
                                {
                                    binFile += '; filename="' + file.name + '"';
                                }
                                binFile += eol;
                                binFile += 'Content-Type: application/octet-stream' + eol + eol;
                                binFile += e.target.result + eol;

                                for (var key in settings.formData)
                                {
                                    binFile += dashes + boundary + eol;
                                    binFile += 'Content-Disposition: form-data; name="' + key + '"' + eol + eol;

                                    //JR - FIX: when uploading multiple files, the file name was not updated properly, so all files got the same name
                                    //whatever is in formData for the filename doesn't change for some reason, so it has to be replaced with the actual file name
                                    if (key === 'filename' && file.name)
                                    {
                                        binFile += file.name + eol;
                                    }
                                    else
                                    {
                                        binFile += settings.formData[key] + eol;
                                    }
                                }

                                binFile += dashes + boundary + dashes + eol;

                                // On progress function
                                xhr.upload.addEventListener('progress', function (e)
                                {
                                    $data.progress(e, file);
                                }, false);

                                // On complete function
                                xhr.addEventListener('load', function (e)
                                {
                                    file.uploading = false;
                                    var status = this.status;
                                    if (status === 404)
                                    {
                                        console.log('%cError: ' + this.statusText, LOG_ERROR); //JR - FIX: log the full response status
                                        $data.error('404_FILE_NOT_FOUND', file, uploadAll);
                                    } else
                                    {
                                        if (file.xhr.responseText.lastIndexOf("error:", 0) !== 0)
                                        { /* ASK - FIX: a more generic approach.  Recommend you adjust upload script accordingly */
                                            $data.uploadComplete(e, file, uploadAll);
                                        } else
                                        {
                                            $data.error(file.xhr.responseText, file, uploadAll);
                                        }
                                    }
                                }, false);

                                // Open the ajax request
                                var url = settings.uploadScript;
                                if (settings.method === 'get')
                                {
                                    var params = $(settings.formData).param();
                                    url += params;
                                }
                                xhr.open(settings.method, settings.uploadScript, true);
                                xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);

                                if (DEBUG_UL5) console.log('%cAJAX Request: ' + url, LOG_TEXT); //JR - FIX: Debug logging

                                // Trigger the uploadFile event
                                if (typeof settings.onUploadFile === 'function')
                                {
                                    settings.onUploadFile.call($this, file);
                                }

                                // Send the file for upload
                                xhr.sendAsBinary(binFile);
                            };
                            reader.readAsBinaryString(file);
                        }
                    }
                };

                // Update a file upload's progress
                $data.progress = function (e, file)
                {
                    if ($.inArray('onProgress', settings.overrideEvents) < 0)
                    {
                        var percent = -1;
                        if (e.lengthComputable)
                        {
                            percent = Math.round((e.loaded / e.total) * 100);
                        }
                        // JR - FIX changed class name to match updated queue template
                        file.queueItem.find('.filestatus').html(percent + '%');
                        file.queueItem.find('.progress-bar').css('width', percent + '%');
                        if (DEBUG_UL5) console.log('%cProgress: ' + file.name + ' ' + file.type + ' - ' + percent + '% ', LOG_TEXT); //JR - FIX: Debug logging
                    }
                    // Trigger the progress event
                    if (typeof settings.onProgress === 'function')
                    {
                        settings.onProgress.call($this, file, e);
                    }
                };

                // Trigger an error
                $data.error = function (errorType, file, uploadAll)
                {
                    if ($.inArray('onError', settings.overrideEvents) < 0)
                    {
                        // Get the error message
                        switch (errorType)
                        {
                            case '404_FILE_NOT_FOUND':
                                errorMsg = '404 Error';
                                break;
                            case '403_FORBIDDEN':
                                errorMsg = '403 Forbidden';
                                break;
                            case 'FORBIDDEN_FILE_TYPE':
                                errorMsg = 'Forbidden File Type';
                                break;
                            case 'FILE_SIZE_LIMIT_EXCEEDED':
                                errorMsg = 'File Too Large';
                                break;
                            default:
                                errorMsg = errorType; /* ASK - FIX: provide useful error message from the server */
                                break;
                        }

                        // Add the error class to the queue item
                        file.queueItem.addClass('error')
                        // Output the error in the queue item
                        // JR - FIX changed class name to match updated queue template
                        .find('.filestatus').html(errorMsg);
                        // Hide the 
                        file.queueItem.find('.progress').remove();
                    }
                    // Trigger the error event
                    if (typeof settings.onError === 'function')
                    {
                        settings.onError.call($this, errorType, file);
                    }
                    file.skip = true;
                    if (errorType === '404_FILE_NOT_FOUND')
                    {
                        $data.uploads.errors++;
                    } else
                    {
                        $data.queue.errors++;
                    }
                    if (uploadAll)
                    {
                        methods.upload.call($this, null, true);
                    }
                };

                // Trigger when a single file upload is complete
                $data.uploadComplete = function (e, file, uploadAll)
                {
                    if (DEBUG_UL5) console.log('%cuploadComplete: ' + file.name, LOG_SUCCESS); //JR - FIX: Debug logging
                    if ($.inArray('onUploadComplete', settings.overrideEvents) < 0)
                    {
                        file.queueItem.find('.progress-bar').css('width', '100%');
                        // JR - FIX changed class name to match updated queue template
                        file.queueItem.find('.filestatus').html('Completed');
                        file.queueItem.find('.progress').slideUp(250);
                        file.queueItem.addClass('complete');
                    }
                    // Trigger the complete event
                    if (typeof settings.onUploadComplete === 'function')
                    {
                        settings.onUploadComplete.call($this, file, file.xhr.responseText);
                    }
                    if (settings.removeCompleted)
                    {
                        setTimeout(function () { methods.cancel.call($this, file); }, 2000); //JR - FIX reduced the wait time before canceling (was 3sec)
                    }
                    file.complete = true;
                    $data.uploads.successful++;
                    $data.uploads.count++;
                    $data.uploads.current--;
                    delete file.xhr;
                    if (uploadAll)
                    {
                        //call upload again to continue with the queue
                        methods.upload.call($this, null, true);
                    }
                };

                // Trigger when all the files are done uploading
                $data.queueComplete = function ()
                {
                    // Trigger the queueComplete event
                    if (typeof settings.onQueueComplete === 'function')
                    {
                        settings.onQueueComplete.call($this, $data.uploads);
                    }
                };

                // ----------------------
                // Initialize UploadiFive
                // ----------------------

                // Check if HTML5 is available
                if (window.File && window.FileList && window.Blob && (window.FileReader || window.FormData))
                {
                    // Assign an ID to the object
                    settings.id = 'uploadifive-' + $this.attr('id');

                    // Wrap the file input in a div with overflow set to hidden
                    $data.button = $('<div id="' + settings.id + '" class="uploadifive-button">' + settings.buttonText + '</div>');
                    if (settings.buttonClass) $data.button.addClass(settings.buttonClass);

                    // JR - FIX: Leave this to the stylesheet. That's what it's for.
                    // Style the button wrapper
                    //$data.button.css({
                    //    'height': settings.height,
                    //    'line-height': settings.height + 'px',
                    //    'overflow': 'hidden',
                    //    'position': 'relative',
                    //    'text-align': 'center',
                    //    'width': settings.width
                    //});

                    // Insert the button above the file input
                    $this.before($data.button)
                    // Add the file input to the button
                    .appendTo($data.button)
                    // Modify the styles of the file input
                    .hide();

                    // Create a new input
                    $data.createInput.call($this);

                    // Create the queue container
                    if (!settings.queueID)
                    {
                        settings.queueID = settings.id + '-queue';
                        $data.queueEl = $('<div id="' + settings.queueID + '" class="uploadifive-queue" />');
                        $data.button.after($data.queueEl);
                    } else
                    {
                        $data.queueEl = $('#' + settings.queueID);
                    }

                    // Add drag and drop functionality
                    if (settings.dnd)
                    {
                        var $dropTarget = settings.dropTarget ? $(settings.dropTarget) : $data.queueEl.get(0);
                        $dropTarget.addEventListener('dragleave', function (e)
                        {
                            // Stop FireFox from opening the dropped file(s)
                            e.preventDefault();
                            e.stopPropagation();
                        }, false);
                        $dropTarget.addEventListener('dragenter', function (e)
                        {
                            // Stop FireFox from opening the dropped file(s)
                            e.preventDefault();
                            e.stopPropagation();
                        }, false);
                        $dropTarget.addEventListener('dragover', function (e)
                        {
                            // Stop FireFox from opening the dropped file(s)
                            e.preventDefault();
                            e.stopPropagation();
                        }, false);
                        $dropTarget.addEventListener('drop', $data.drop, false);
                    }

                    // Send as binary workaround for Chrome
                    if (!XMLHttpRequest.prototype.sendAsBinary)
                    {
                        XMLHttpRequest.prototype.sendAsBinary = function (datastr)
                        {
                            function byteValue(x)
                            {
                                return x.charCodeAt(0) & 0xff;
                            }
                            var ords = Array.prototype.map.call(datastr, byteValue);
                            var ui8a = new Uint8Array(ords);
                            this.send(ui8a.buffer);
                        };
                    }

                    // Trigger the oninit event
                    if (typeof settings.onInit === 'function')
                    {
                        settings.onInit.call($this);
                    }

                } else
                {

                    // Trigger the fallback event
                    if (typeof settings.onFallback === 'function')
                    {
                        settings.onFallback.call($this);
                    }
                    return false;

                }

            });

        },

        // Write some data to the console
        debug: function ()
        {

            return this.each(function ()
            {

                console.log($(this).data('uploadifive'));

            });

        },

        // Clear all the items from the queue
        clearQueue: function ()
        {

            this.each(function ()
            {

                var $this = $(this),
                    $data = $this.data('uploadifive'),
                    settings = $data.settings;

                for (var key in $data.inputs)
                {
                    input = $data.inputs[key];
                    limit = input.files.length;
                    for (i = 0; i < limit; i++)
                    {
                        file = input.files[i];
                        methods.cancel.call($this, file);
                    }
                }
                // Trigger the onClearQueue event
                if (typeof settings.onClearQueue === 'function')
                {
                    settings.onClearQueue.call($this, $('#' + $data.settings.queueID));
                }

                $data.cleanInputs();
            });

        },

        // Cancel a file upload in progress or remove a file from the queue
        cancel: function (file, fast)
        {

            this.each(function ()
            {

                var $this = $(this),
                    $data = $this.data('uploadifive'),
                    settings = $data.settings;

                // If user passed a queue item ID instead of file...
                if (typeof file === 'string')
                {
                    if (!isNaN(file))
                    {
                        fileID = 'uploadifive-' + $(this).attr('id') + '-file-' + file;
                    }
                    file = $('#' + fileID).data('file');
                }

                file.skip = true;
                $data.filesCancelled++;
                if (file.uploading)
                {
                    $data.uploads.current--;
                    file.uploading = false;
                    file.xhr.abort();
                    delete file.xhr;
                    methods.upload.call($this);
                }
                if ($.inArray('onCancel', settings.overrideEvents) < 0)
                {
                    $data.removeQueueItem(file, fast);
                }

                // Trigger the cancel event
                if (typeof settings.onCancel === 'function')
                {
                    settings.onCancel.call($this, file);
                }

                $data.cleanInputs();
            });

        },

        // Upload the files in the queue
        upload: function (file, keepVars)
        {
            if (DEBUG_UL5) console.log('%cupload', LOG_START); //JR - FIX: Debug logging

            this.each(function ()
            {

                var $this = $(this),
                    $data = $this.data('uploadifive'),
                    settings = $data.settings;

                if (file)
                {
                    $data.uploadFile.call($this, file);
                } else
                {
                    // Check if the upload limit was reached
                    if (($data.uploads.count + $data.uploads.current) < settings.uploadLimit || settings.uploadLimit === 0)
                    {
                        if (!keepVars)
                        {
                            $data.uploads.attempted = 0;
                            $data.uploads.successsful = 0;
                            $data.uploads.errors = 0;
                            var filesToUpload = $data.filesToUpload();
                            // Trigger the onUpload event
                            if (typeof settings.onUpload === 'function')
                            {
                                settings.onUpload.call($this, filesToUpload);
                            }
                        }

                        /* ASK - FIX BEGIN */
                        /* JR - FIX BEGIN: remove synchronous AJAX check by using callbacks instead */
                        $('#' + settings.queueID).find('.uploadifive-queue-item').not('.error, .complete').each(function ()
                        {
                            if (DEBUG_UL5) console.log('%cupload - Next queue item: ' + $(this).data('file').name, LOG_TEXT); //JR - FIX: Debug logging
                            var intLimit = settings.UploadLimit;
                            var intSimLimit = settings.simUploadLimit;
                            var intChecking = $data.checking;
                            var intCurrent = $data.uploads.current;
                            var intCount = $data.uploads.count;

                            // Check if the simUpload limit was reached
                            if ((intCurrent + intChecking >= intSimLimit && intSimLimit !== 0) || (intCurrent + intChecking >= intLimit && intLimit !== 0) || (intCount >= intLimit && intLimit !== 0))
                            {
                                if (DEBUG_UL5) //JR - FIX: Debug logging
                                { 
                                    console.log('%cupload - Queue limit reached: ' + $(this).data('file').name, LOG_IMPORTANT);
                                    console.log('%c    limit: ' + intLimit + '\n    sim limit: ' + intSimLimit + '\n    checking: ' + intChecking + '\n    uploading: ' + intCurrent + '\n    uploads: ' + intCount, LOG_TEXT);
                                }
                            }
                            else
                            {
                                // Run check script first if required...
                                if (settings.checkScript)
                                {
                                    _file = $(this).data('file');
                                    if (typeof _file.skip === 'undefined' && typeof _file.uploading === 'undefined') //JR - FIX: files that were already uploading were being checked again
                                    {
                                        //if (DEBUG_UL5) console.log('%ccheck file: ' + _file.name, LOG_TEXT); //JR - FIX: Debug logging
                                        $data.checkExists(_file, true);
                                    }
                                }
                                else
                                {
                                    // Start uploading the file...
                                    $data.startFileUpload($(this).data('file'));
                                }
                            }
                        });
                        /* JR - FIX END */
                        /* ASK - FIX END */
                        if ($('#' + settings.queueID).find('.uploadifive-queue-item').not('.error, .complete').size() === 0)
                        {
                            $data.queueComplete();
                        }
                    } else
                    {
                        if ($data.uploads.current === 0)
                        {
                            if ($.inArray('onError', settings.overrideEvents) < 0)
                            {
                                if ($data.filesToUpload() > 0 && settings.uploadLimit !== 0)
                                {
                                    alert('The maximum upload limit has been reached.');
                                }
                            }
                            // Trigger the onError event
                            if (typeof settings.onError === 'function')
                            {
                                settings.onError.call($this, 'UPLOAD_LIMIT_EXCEEDED', $data.filesToUpload());
                            }
                        }
                    }

                }

            });

        },

        // Destroy an instance of UploadiFive
        destroy: function ()
        {

            this.each(function ()
            {

                var $this = $(this),
                    $data = $this.data('uploadifive'),
                    settings = $data.settings;

                // Clear the queue
                methods.clearQueue.call($this);
                // Destroy the queue if it was created
                if (!settings.queueID) $('#' + settings.queueID).remove();
                // Remove extra inputs
                $this.siblings('input').remove();
                // Show the original file input
                $this.show()
                // Move the file input out of the button
                .insertBefore($data.button);
                // Delete the button
                $data.button.remove();
                // Trigger the destroy event
                if (typeof settings.onDestroy === 'function')
                {
                    settings.onDestroy.call($this);
                }

            });

        }
    };

    $.fn.uploadifive = function (method)
    {
        if (DEBUG_UL5) console.log('%cuploadifive: ' + method, LOG_START); //JR - FIX: Debug logging

        if (methods[method])
        {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method)
        {
            return methods.init.apply(this, arguments);
        } else
        {
            $.error('The method ' + method + ' does not exist in $.uploadify');
        }

    };

})(jQuery);
