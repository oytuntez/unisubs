// Amara, universalsubtitles.org
// 
// Copyright (C) 2012 Participatory Culture Foundation
// 
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
// 
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see 
// http://www.gnu.org/licenses/agpl-3.0.html.

var AmaraDFXPParser = function(AmaraDFXPParser) {
    /*
     * A utility for working with DFXP subs.
     * The front end app needs all timming data to be
     * stored in milliseconds for processing. On `init` we convert
     * time expressions to milliseconds
     */

    var that = this;
    var $ = window.AmarajQuery.noConflict();

    this.init = function(xml) {

        if (typeof xml === 'string') {
            xml = $.parseXML(xml);
        }

        // Store the original XML for comparison later.
        this.$originalXml = $(xml.documentElement).clone();

        // Store the working XML for local edits.
        this.$xml = $(xml.documentElement).clone();

        // Cache the query for the containing div.
        //
        // TODO: This is broken because there may be multiple containing divs.
        // The only reliable container is a <body> element.
        this.$div = $('div', this.$xml);

        // Convert both subtitle sets to milliseconds.
        this.convertTimes('milliseconds', $('div p', this.$originalXml));
        this.convertTimes('milliseconds', $('div p', this.$xml));
    };

    this.utils = {
        millisecondsToTimeExpression: function(milliseconds) {
            /*
             * Parses milliseconds into a time expression.
             */
            if (milliseconds === -1 || milliseconds === undefined || milliseconds === null) {
                throw Error("Invalid milliseconds to be converted" + milliseconds)
            }
            var time = Math.floor(milliseconds / 1000);
            var hours = ~~(time / 3600);
            var minutes = ~~((time % 3600) / 60);
            var fraction = milliseconds % 1000;
            var p = this.utils.leftPad;
            var seconds = time % 60;
            return p(hours, 2) + ':' +
                p(minutes, 2) + ':' +
                p(seconds, 2) +  ',' +
                p(fraction, 3);
        },
        timeExpressionToMilliseconds: function(timeExpression) {
            /*
             * Converts a time expression into milliseconds.
             * Since we trust the backend has generated this value,
             * we're not being to defensive about parsing, we
             * expect this to be in the HH:MM:SS.FFF form.
             * If number of digits on fraction is less than 3,
             * we right pad them.
             * Returns: int
             */
            var components = timeExpression.match(/([\d]{2}):([\d]{2}):([\d]{2}).([\d]{1,3})/i);
            var millisecondsInHours   = components[1] * (3600 * 1000);
            var millisecondsInMinutes = components[2] * (60 * 1000);
            var millisecondsInSeconds = components[3] * (1000);
            var millisecondsInFraction = parseInt(this.utils.rightPad(components[4], 3));

            return parseInt(millisecondsInHours +
                                millisecondsInMinutes +
                                millisecondsInSeconds +
                                 + millisecondsInFraction);

        },
        xmlToString: function(xml) {
            /*
             * Convert an XML document to a string.
             *
             * Accepts: document object (XML tree)
             * Returns: string
             */

            var xmlString;

            // For Internet Explorer.
            if (window.ActiveXObject) {
                xmlString = xml.xml;

            // Everyone else.
            } else {
                xmlString = (new XMLSerializer()).serializeToString(xml);
            }
            
            return xmlString;
        },
        leftPad: function(number, width, char) {
            /*
             * Left Pad a number to the given width, with zeros.
             * From: http://stackoverflow.com/a/1267338/22468
             *
             * Returns: string
             */

            char = char || '0';
            width -= number.toString().length;

            if (width > 0) {
                return new Array(width + (/\./.test(number) ? 2 : 1))
                                .join(char) + number;
            }
            return number.toString();
        },
        rightPad: function(number, width, char) {
            /*
             * Right Pad a number to the given width, with zeros.
             * From: http://stackoverflow.com/a/1267338/22468
             *
             * Returns: string
             */

            char = char || '0';
            width -= number.toString().length;

            if (width > 0) {
                return number + new Array(width + (/\./.test(number) ? 2 : 1))
                    .join(char);
            }
            return number.toString();
        }


    };

    this.addSubtitle = function(after, newAttrs, content) {
        /*
         * For adding a new subtitle to this set.
         *
         * If `after` is provided, we'll place the new subtitle directly
         * after that one. Otherwise, we'll place the new subtitle at the
         * beginning or end depending on subtitle count.
         *
         * `newAttrs` is an optional JSON object specifying the attributes to
         * be applied to the new element.
         *
         * `content` is an optional string to set the initial content.
         *
         * Returns: new subtitle element
         */

        if (typeof after != 'number') {

            // If we have subtitles, default placement should be at the end.
            if (this.subtitlesCount()) {
                after = this.getLastSubtitle();

            // Otherwise, place the first subtitle at the beginning.
            } else {
                after = -1;
            }
        }

        // Create the new element manually. If you create with jQuery, it'll use
        // the document's namespace as the default namespace, which is ugly.
        var newSubtitle = document.createElementNS('', 'p');

        // Init the default attrs and combine them with the defined newAttrs if
        // required.
        newAttrs = $.extend({
            'begin': '',
            'end': ''
        }, newAttrs);

        var $newSubtitle = $(newSubtitle).attr(newAttrs);


        // Finally, place the new subtitle.
        //
        // If after is -1, we need to place the subtitle at the beginning.
        if (after === -1) {

            // Prepend this new subtitle directly inside of the containing div.
            // TODO: This is broken because there may be multiple containing
            // divs.
            this.$div.prepend($newSubtitle);

        // Otherwise, place it after the designated subtitle.
        } else {

            // First just make sure that the previous subtitle exists.
            var $previousSubtitle = this.getSubtitle(after);

            // Then place it.
            $previousSubtitle.after($newSubtitle);
        }

        if (typeof content !== 'undefined') {
            if (content === null) {
                this.content($newSubtitle, '');
            } else {
                this.content($newSubtitle, content);
            }
        }

        return $newSubtitle.get(0);
    };
    this.changesMade = function() {
        /*
         * Check to see if any changes have been made to the working XML.
         *
         * Returns: true || false
         */

        var originalString = that.utils.xmlToString(that.$originalXml.get(0));
        var xmlString = that.utils.xmlToString(that.$xml.get(0));

        return originalString != xmlString;
    };
    this.clearAllContent = function() {
        /*
         * Clear all of the content data for every subtitle.
         *
         * Returns: true
         */

        this.getSubtitles().text('');
    };
    this.clearAllTimes = function() {
        /*
         * Clear all of the timing data for every subtitle.
         *
         * Returns: true
         */

        this.getSubtitles().attr({
            'begin': '',
            'end': ''
        });

        return true;
    };
    this.content = function(indexOrElement, content) {
        /*
         * Either get or set the HTML content for the subtitle.
         *
         * Returns: current content (string)
         */

        var $subtitle = this.getSubtitle(indexOrElement);

        if (typeof content !== 'undefined') {
            $subtitle.text(content);
        }

        // OK. So, when parsing an XML node, you can't just get the HTML content.
        // We need to retrieve the total contents of the node by using "contents()",
        // but that returns an array of objects, like ['<b>', 'hi', '</b>', '<br />'],
        // etc. So we create a temporary div, and append the array to it, and retrieve
        // the rendered HTML that way. Then remove the temporary div.
        //
        // Reference: http://bit.ly/SwbPeR
        return $('<div>').append($subtitle.contents().clone()).remove().html();

    };
    this.convertTimes = function(toFormat, $subtitles) {
        /*
         * Convert times to either milliseconds or time expressions
         * in the 'begin' and 'end' attributes, IN PLACE.
         */
        var convertFn = null;
        if (toFormat === 'milliseconds'){
            convertFn = that.utils.timeExpressionToMilliseconds;
        }else if (toFormat=== 'timeExpression'){
            convertFn = that.utils.millisecondsToTimeExpression;
        }else{
            throw new Error("Unsoported time convertion " + toFormat);
        }
        for (var i = 0; i < $subtitles.length; i++) {
            var sub, currentStartTime, currentEndTime;
            sub = $subtitles.eq(i);
            currentStartTime = sub.attr('begin');
            currentEndTime = sub.attr('end');
            if (currentStartTime){
                sub.attr('begin', convertFn.call(this, currentStartTime));
            }
            if (currentEndTime){
                sub.attr('end', convertFn.call(this, currentEndTime));
            }
        }

    };
    this.endTime = function(indexOrElement, endTime) {
        /*
         * Either get or set the end time for the subtitle.
         *
         * Returns: current end time (string)
         */

        var $subtitle = this.getSubtitle(indexOrElement);

        if (typeof endTime !== 'undefined') {
            if (parseFloat(endTime)) {
                $subtitle.attr('end', endTime);
            } else {
                $subtitle.attr('end', '');
            }
        }

        if (!$subtitle ) {
            return -1;
        }
        return parseFloat($subtitle.attr('end')) || -1;
    };
    this.getFirstSubtitle = function() {
        /*
         * Retrieve the first subtitle in this set.
         *
         * Returns: first subtitle element
         */

        return this.getSubtitle(0).get(0);
    };
    this.getLastSubtitle = function() {
        /*
         * Retrieve the last subtitle in this set.
         *
         * Returns: subtitle element or empty array
         */

        // Cache the selection.
        var $subtitles = this.getSubtitles();

        return this.getSubtitle($subtitles.length - 1).get(0);
    };
    this.getNextSubtitle = function(indexOrElement) {
        /*
         * Retrieve the subtitle that follows the given subtitle.
         *
         * Returns: subtitle element or empty array
         */

        var el =this.getSubtitle(indexOrElement);

        if (!el) {
            return null;
        }
        return el.next().length > 0 ? el.next().eq(0) : null;
    };
    this.getNonBlankSubtitles = function() {
        /*
         * Retrieve all of the subtitles that have content.
         *
         * Returns: jQuery selection of elements
         */

        return this.getSubtitles().filter(function() {
            return $(this).text() !== '';
        });
    };
    this.getPreviousSubtitle = function(indexOrElement) {
        /*
         * Retrieve the subtitle that precedes the given subtitle.
         *
         * Returns: subtitle element
         */

        var el = this.getSubtitle(indexOrElement);

        if (!el) {
            return null;
        }
        return el.prev().length > 0 ? el.prev().eq(0) : null;
    };
    this.getSubtitleIndex = function(subtitle) {
        /*
         * Retrieve the index of the given subtitle.
         *
         * Returns: integer
         */

        if (subtitle instanceof AmarajQuery) {
            subtitle = subtitle.get(0);
        }

        var $subtitles = this.getSubtitles();
        for (var i= 0; i < $subtitles.length; i++) {
            if ($subtitles.get(i) === subtitle) {
                return i;
            }
        }

        return -1;

    };
    this.getSubtitle = function(indexOrElement) {
        /*
         * Retrieve the subtitle based on the index given.
         *
         * If the given argument is an object, assume it's a DOM node
         * and check to make sure it exists in the subtitles tree.
         *
         * Returns: jQuery selection of element.
         *
         */

        // If an index or an object is not provided, throw an error.
        if (typeof indexOrElement !== 'number' && typeof indexOrElement !== 'object') {
            throw new Error('DFXP: You must supply either an index or an element.');
        }
        var subtitle;

        // If indexOrElement is a number, we'll need to query the DOM to
        // get the element.
        //
        // Note: you should only use this approach for checking one-off
        // subtitles. If you're checking more than one subtitle, it's much
        // faster to pass along pre-selected elements instead.
        //
        // Note also: if you're performing actions on a larger number of
        // subtitles, please consider using getSubtitles() and manually
        // iterating, to avoid performing DOM selection for lots of nodes.
        if (typeof indexOrElement === 'number') {
            subtitle = this.getSubtitles().get(indexOrElement);

        // Otherwise, it's an object.
        } else {

            // If this is already a jQuery selection, we need to extract the
            // node first.
            if (indexOrElement instanceof AmarajQuery) {
                indexOrElement = indexOrElement.get(0);
            }

            // Make sure the node exists in the DFXP tree.
            var $subtitles = this.getSubtitles();
            for (var i= 0; i < $subtitles.length; i++) {
                if ($subtitles.get(i) === indexOrElement) {
                    subtitle = $subtitles.get(i);
                    break;
                }
            }

        }

        if (!subtitle) {
            return null;
        }

        return $(subtitle);
    };
    this.getSubtitles = function() {
        /*
         * Retrieve the current set of subtitles.
         *
         * Returns: jQuery selection of nodes
         */

        return $('div p', this.$xml);
    };
    this.isShownAt = function(indexOrElement, time) {
        /*
         * Determine whether the given subtitle should be displayed
         * at the given time.
         *
         * Returns: true || false
         */

        var subtitle = this.getSubtitle(indexOrElement).get(0);

        return (time >= this.startTime(subtitle) &&
                time <= this.endTime(subtitle));
    };
    this.needsAnySynced = function() {
        /*
         * Determine whether any of the subtitles in the set need
         * to be synced.
         *
         * Returns: true || false
         */

        var $subtitles = this.getSubtitles();

        for (var i = 0; i < $subtitles.length; i++) {
            var $subtitle = $subtitles.eq(i);

            var startTime = $subtitle.attr('begin');
            var endTime = $subtitle.attr('end');

            // If start time is empty, it always needs to be synced.
            if (startTime === '') {
                return true;
            }

            // If the end time is empty and this is not the last subtitle,
            // it needs to be synced.
            if (endTime === '' && (subtitle !== this.getLastSubtitle())) {
                return true;
            }

        }

        // Otherwise, we're good.
        return false;
    };
    this.needsAnyTranscribed = function() {
        /*
         * Check all of the subtitles for empty content.
         *
         * Returns: true || false
         */

        var $subtitles = this.getSubtitles();

        for (var i = 0; i < $subtitles.length; i++) {

            var $subtitle = $subtitles.eq(i);
            var content = $('<div>').append($subtitle.contents().clone()).remove().html();

            if (content === '') {
                return true;
            }
        }

        return false;
    };
    this.needsSyncing = function(indexOrElement) {
        /*
         * Given the zero-index or the element of the subtitle to be
         * checked, determine whether the subtitle needs to be synced.
         *
         * In most cases, if a subtitle has either no start time,
         * or no end time, it needs to be synced. However, if the
         * subtitle is the last in the list, the end time may be
         * omitted.
         *
         * Returns: true || false
         */

        var $subtitle = this.getSubtitle(indexOrElement);

        var startTime = $subtitle.attr('begin');
        var endTime = $subtitle.attr('end');

        // If start time is empty, it always needs to be synced.
        if (startTime === '') {
            return true;
        }

        // If the end time is empty and this is not the last subtitle,
        // it needs to be synced.
        if (endTime === '' && (subtitle !== this.getLastSubtitle())) {
            return true;
        }

        // Otherwise, we're good.
        return false;
    };
    this.originalContent = function(indexOrElement, content) {
        /*
         * Either get or set the original HTML content for the subtitle.
         *
         * Returns: current original content (string)
         */

        var $subtitle = this.getSubtitle(indexOrElement);

        if (typeof content !== 'undefined') {
            $subtitle.attr('originalcontent', content);
        }

        return $subtitle.attr('originalcontent');

    };
    this.originalEndTime = function(indexOrElement, originalEndTime) {
        /*
         * Either get or set the original end time for the subtitle.
         *
         * Returns: current original end time (string)
         */

        var $subtitle = this.getSubtitle(indexOrElement);

        if (typeof originalEndTime !== 'undefined') {
            if (parseFloat(originalEndTime)) {
                $subtitle.attr('originalend', originalEndTime);
            } else {
                $subtitle.attr('originalend', '');
            }
        }

        return $subtitle.attr('originalend');
    };
    this.originalStartTime = function(indexOrElement, originalStartTime) {
        /*
         * Either get or set the original start time for the subtitle.
         *
         * Returns: current original start time (string)
         */

        var $subtitle = this.getSubtitle(indexOrElement);

        if (typeof originalStartTime !== 'undefined') {
            if (parseFloat(originalStartTime)) {
                $subtitle.attr('originalbegin', originalStartTime);
            } else {
                $subtitle.attr('originalbegin', '');
            }
        }

        return $subtitle.attr('originalbegin');
    };
    this.originalXmlToString = function() {
        return this.utils.xmlToString(this.$originalXml.get(0));
    };
    this.removeSubtitle = function(indexOrElement) {
        /*
         * Given the zero-index of the subtitle to be removed,
         * remove it from the node tree.
         *
         * Returns: true
         */

        var $subtitle = this.getSubtitle(indexOrElement);

        $subtitle.remove();

        return true;
    };
    this.removeSubtitles = function() {
        /*
         * Remove all subtitles from the working set.
         *
         * Returns: true
         */

        this.getSubtitles().remove();

        return true;
    };
    this.resetSubtitles = function() {
        /*
         * For each subtitle, if the content is empty, delete the subtitle.
         * Otherwise, just reset the text and the start/end times.
         *
         * Returns: true
         */

        var $subtitles = this.getSubtitles();

        for (var i = 0; i < $subtitles.length; i++) {

            var $subtitle = $subtitles.eq(i);
            var content = $('<div>').append($subtitle.contents().clone()).remove().html();

            if (content === '') {
                $subtitle.remove();
            } else {
                $subtitle.text('').attr({
                    'begin': '',
                    'end': ''
                });
            }
        }
    };
    this.startOfParagraph = function(indexOrElement, startOfParagraph) {
        /*
         * Either get or set the startofparagraph for the subtitle.
         *
         * A <div> element marks the start of a new paragraph, 
         * therefore all first subtitles are start of paragraphs.
         * When we want to set it to true, we wrap that <p> inside
         * a <div> (checking that we're not already a first paragraph ).
         *
         * Returns: current state of startofparagraph (boolean)
         */

        var $subtitle = this.getSubtitle(indexOrElement);

        if (typeof startOfParagraph !== 'undefined') {

            if (startOfParagraph) {

                // If the subtitle is not the first child, then we need to wrap
                // the subtitle in a div.
                if (!$subtitle.is(':first-child')) {
                     $subtitle.wrap('<div>');
                }
            } else if ($subtitle.is(':first-child') &&
                       $subtitle.parent().get(0) !== this.$div.get(0)) {
                $subtitle.unwrap();
            }
        }

        return $subtitle.is(':first-child');
    };
    this.startTime = function(indexOrElement, startTime) {
        /*
         * Either get or set the start time for the subtitle.
         *
         * Returns: current start time (string)
         */

        var $subtitle = this.getSubtitle(indexOrElement);

        if (typeof startTime !== 'undefined') {
            if (parseFloat(startTime)) {
                $subtitle.attr('begin', startTime);
            } else {
                $subtitle.attr('begin', '');
            }
        }

        if (!$subtitle ) {
            return -1;
        }

        return parseFloat($subtitle.attr('begin')) || -1;
    };
    this.subtitlesCount = function() {
        /*
         * Retrieve the current number of subtitles.
         *
         * Returns: integer
         */

        return this.getSubtitles().length;
    };
    this.xmlToString = function(converToTimeExpression) {
        /*
         * Parse the working XML to a string.
         *
         * If `convertToTimeExpression` is specified, we convert current
         * `begin` and `end` attrubutes from the working format (milliseconds)
         * to time expressins, otherwise, output what we've got
         * Returns: string
         */

        // If we want to get the DFXP string with milliseconds, we need to
        // just return the current state of the XML tree, since we always
        // convert to milliseconds on init (see init() above).
        if (! converToTimeExpression) {
            return this.utils.xmlToString(this.$xml.get(0));
        }

        // Since our back-end is expecting time expressions, we need to convert
        // the working XML's times to time expressions.
        var $cloned = this.$xml.clone();
        this.convertTimes('timeExpression', $('div p', $cloned));
        return this.utils.xmlToString($cloned.get(0));
    };
};