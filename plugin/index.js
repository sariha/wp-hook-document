'use strict';


/**
 * Only use comment blocks which has a @hook tag and simulate as @class.
 */

const fs = require('jsdoc/lib/jsdoc/fs');
// Monkey-patch resolver.load pour stocker le chemin du fichier
const resolver = require('jsdoc/tutorial/resolver');
const tutorial = require('jsdoc/tutorial');
const path = require('path');
const env = require('jsdoc/lib/jsdoc/env');


exports.handlers = {
    parseBegin: function() {

        const finder = /^(.*?)(?:\.(md|markdown|html|htm|xml|xhtml|json))$/i;

        // Surcharge de la méthode load
        resolver.load = function(filepath) {

            let content;
            let current;

            let name;
            let match;
            let type;

            const files = fs.ls(filepath, 3);

            const pathFolder = path.basename(filepath);

            // tutorials handling
            files.forEach(file => {
                match = file.match(finder);

                // any filetype that can apply to tutorials
                if (match) {

                    const separator = path.sep;

                    name = file
                        .replace(pathFolder, '')
                        .slice(1)
                        .replace(/(\.md|\.markdown|\.html|\.htm|\.xml|\.xhtml|\.json)$/i, '')
                        .replace(new RegExp(`\\${separator}`, 'g'), '/');



                    content = fs.readFileSync(file, env.opts.encoding || 'utf8');

                    switch (match[2].toLowerCase()) {
                        // HTML type
                        case 'xml':
                        case 'xhtml':
                        case 'html':
                        case 'htm':
                            type = tutorial.TYPES.HTML;
                            break;

                        // Markdown typs
                        case 'md':
                        case 'markdown':
                            type = tutorial.TYPES.MARKDOWN;
                            break;

                        // how can it be? check `finder' regexp
                        // not a file we want to work with
                        default:
                            return;
                    }

                    current = new tutorial.Tutorial(name, content, type);

                    current.path = file;

                    resolver.addTutorial(current);
                }
            });




        };
    },
    beforeParse: function(e) {
        // a JSDoc comment looks like: /**[one or more chars]*/
        var parsed = [];
        var comments = e.source.match(/\/\*\*[\s\S]+?\*\//g);

        if (comments) {
            // Generate new lines for non-comform comments
            comments.forEach(function(comment) {
                if (!/\*[ \t]*@hook[ ]/g.test(comment)) {
                    e.source = e.source.replace(comment, '\n'.repeat(comment.split('\n').length - 1));
                }
            });

            // Generate Hooks only
            comments.forEach(function(comment) {
                if (/\*[ \t]*@hook[ ]/g.test(comment)) {
                    parsed.push(comment);
                }
            });
        }

        if (parsed.length) {
            e.source = e.source.split(/\/\*\*[\s\S]+?\*\//g).reduce((res, src, i) => res + src.replace(/[^\n]/g, '') + parsed[i], '');
        }else{
            e.source = ''; // If file has no comments, parser should still receive no code
        }
    },
    newDoclet: function(e) {
        if (e.doclet.kind === 'hook') {
            // Déterminer le type de fichier (PHP ou JS)
            const fileExt = e.doclet.meta.filename.split('.').pop().toLowerCase();
            e.doclet.fileType = (fileExt === 'php') ? 'PHP' : 'JS';

            // Déterminer le type de hook (filter ou action)
            // Un hook est un filter s'il a un tag @return ou @returns, sinon c'est une action
            const hasReturnTag = e.doclet.returns && e.doclet.returns.length > 0;
            const tags = e.doclet.tags || [];
            const hasReturnInTags = tags.some(tag => tag.title === 'return' || tag.title === 'returns');

            e.doclet.hookType = (hasReturnTag || hasReturnInTags) ? 'filter' : 'action';

            // Optionnel: Ajouter ces informations au nom pour une meilleure visibilité
            e.doclet.longname = `${e.doclet.fileType}_${e.doclet.hookType}_${e.doclet.longname}`;
        }
    }
};


exports.defineTags = function( dictionary) {
    /**
     * @name hook
     * @summary A hook is a function that is called at a specific point in the execution of a program.
     * @description Hooks allow you to extend the functionality of a program without modifying its source code.
     * @see {@link https://developer.wordpress.org/plugins/hooks/}
     */
    dictionary.defineTag('hook', {
        // isNamespace: true,
        onTagged: function(doclet, tag) {
            // Set the kind of the doclet to 'hook'
            doclet.kind = 'hook';

            // Set the name of the doclet based on the tag value
            if (tag.value) {
                doclet.name = tag.value.name || tag.value;
            }
        }
    });
}
