(function($) {
    $(function() {
        var terminal = $('pre.terminal'),
        colours = $('[name="colours"]'),
        light = $('[name="light"]'),

        _shareLink = function() {
            var url = window.location.href.replace(/#.+/, '');

            if (terminal.text()) {
                url += '#!terminal=' + btoa(terminal.text()) + '&' + $('.global-options :checked').serialize();
            }

            if (window.location.href != url) {
                history.pushState(history.state, url, url);
            }

            return url;
        },
        _updateDisplay = function() {
            $('.copy-paste .contents').html(terminal.text());
        },
        _loadFromHash = function() {
            if (window.location.hash) {
                var data = window.location.hash.replace(/^#!/, ''),
                elements = {
                    terminal: terminal,
                    colours: colours,
                    light: light
                };

                $('.global-options [type="checkbox"]').prop('checked', false).trigger('change');

                data.split(/&/).forEach(function(item) {
                    var data = item.split(/=/),
                    element = elements[data[0]],
                    value;

                    if (element === terminal) {
                        value = atob(data[1]);
                        element.text(value).trigger('change');
                    }
                    else {
                        value = data[1];

                        if (element) {
                            if (element.is('[type="radio"], [type="checkbox"]')) {
                                element.filter('[value="' + value + '"]').prop('checked', true).trigger('change');
                            }
                            else {
                                element.val(value).trigger('change');
                            }
                        }
                    }
                });
            }
        },
        _buildStyle = function() {
            var block = {
                type: 'styling'
            },
            inputs = $(':input');

            block.style = $.extend({}, parse.defaultStyle);

            inputs.filter(':not([name="bg-default"], [name="fg-default"])').each(function() {
                var value;

                if ($(this).is('select')) {
                    value = $(this).val();
                }
                else if ($(this).is('[type="checkbox"]')) {
                    value = this.checked;
                }
                else if ($(this).is('[type="radio"]')) {
                    if (this.checked) {
                        value = this.value;
                    }
                }
                else {
                    value = this.value;
                }

                if (this.name === 'bg' || this.name === 'fg') {
                    if ($('[name="colours"]:checked').val() === '16') {
                        block.style[this.name] = parse.rgbToTerm16(parse.hexToRgb(value), this.name == 'bg');
                    }
                    else if ($('[name="colours"]:checked').val() === '256') {
                        block.style[this.name] = parse.simplifyColour('256-' + parse.rgbToTerm256(parse.hexToRgb(value)), this.name == 'bg');
                    }
                    else {
                        block.style[this.name] = parse.simplifyColour('true-' + parse.hexToRgb(value).join('-'), this.name == 'bg');
                    }
                }
                else if (['bold', 'dim', 'italic', 'underline', 'blink', 'overline', 'invert', 'hidden', 'strikethrough'].includes(this.name)) {
                    block.style[this.name] = value;
                }
                else {
                    block[this.name] = value;
                }
            });

            inputs.filter('[name="bg-default"], [name="fg-default"]').each(function() {
                if (this.checked) {
                    if (this.name === 'fg-default') {
                        block.style.fg = '39';
                    }
                    else if (this.name === 'bg-default') {
                        block.style.bg = '49';
                    }
                }
            });

            block.content = parse.buildStyles(block.style);
            block.value = block.content.replace(/\\(e|x1b|033)\[|m$/g,'');

            terminal.html(parse.process([block]));
            $('.copy-paste .contents').html(block.value);
        };

        new Clipboard('.share', {
            text: _shareLink
        });

        $('.share').on('click', function(event) {
            event.preventDefault();

            $('.url-copied').removeClass('hidden').show();

            window.setTimeout(function() {
                $('.url-copied').fadeOut('slow');
            }, 5000);
        });

        terminal.on('change', function() {
            _updateDisplay();
        });

        $('.global-options input[type="checkbox"]').on('change', function() {
            if (this.checked) {
                terminal.addClass(this.name);
            }
            else {
                terminal.removeClass(this.name);
            }
        });

        $('.global-options input[name="colours"]').on('change', function(event) {
            if (!this.checked) {
                return;
            }

            if (this.value === '256') {
                if (terminal.text().match(/\b38;2;|\b48;2;/)) {
                    if (confirm('Would you like to convert all existing colours to the 256 colour palette? (You can use the back button to undo)')) {
                        _shareLink();

                        terminal.html(parse(terminal.text().replace(/38;2;(\d+);(\d+);(\d+)/, function(string, r, g, b) {
                            return ('38;5;' + parse.rgbToTerm256([r, g, b])).replace(/256-/, '');
                        }).replace(/48;2;(\d+);(\d+);(\d+)/g, function(string, r, g, b) {
                            return ('48;5;' + parse.rgbToTerm256([r, g, b])).replace(/256-/, '');
                        })));

                        _updateDisplay();
                        _shareLink();
                    }
                    else {
                        event.preventDefault();

                        return false;
                    }
                }
            }
            else if (this.value === '16') {
                if (terminal.text().match(/\b38;2;|\b48;2;|\b38;5;|\b48;5;/)) {
                    if (confirm('Would you like to convert all existing colours to the 16 colour palette? (You can use the back button to undo)')) {
                        _shareLink();

                        terminal.html(parse(terminal.text().replace(/38;2;(\d+);(\d+);(\d+)/g, function(string, r, g, b) {
                            return '38;5;' + parse.rgbToTerm16([r, g, b]);
                        }).replace(/48;2;(\d+);(\d+);(\d+)/g, function(string, r, g, b) {
                            return '48;5;' + parse.rgbToTerm16([r, g, b], true);
                        }).replace(/38;5;(\d+)/g, function(string, id) {
                            return parse.rgbToTerm16(parse.term256ToRgb(id));
                        }).replace(/48;5;(\d+)/g, function(string, id) {
                            return parse.rgbToTerm16(parse.term256ToRgb(id), true);
                        })));

                        _updateDisplay();
                        _shareLink();
                    }
                    else {
                        event.preventDefault();

                        return false;
                    }
                }
            }
        });

        $('[name="fg-default"], [name="bg-default"]').on('change', function() {
            var container = $(this).parents('.checkbox');

            if (this.checked) {
                container.next().hide().attr('disabled');
            }
            else {
                container.next().show().removeAttr('disabled');
            }

            _buildStyle();
        }).trigger('change');

        if (Clipboard.isSupported()) {
            new Clipboard('a.copy');
        }
        else {
            $('body').addClass('no-clipboard');
        }

        $('a.copy').on('click', function(event) {
            event.preventDefault();
        });

        $('.colours input[type="color"]').on('change', function() {
            _buildStyle();
        });


        $('.text-styles input[type="checkbox"]').on('change', function() {
            _buildStyle();
        });

        $(window).on("popstate", function(e) {
            _loadFromHash();
        });

        _loadFromHash();
    });
})(jQuery);
