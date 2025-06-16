'use strict';

const markdown = require('jsdoc/util/markdown');

/**
 *  Custom Markdown parser that modifies the source text before parsing.
 */
const originalGetParser = markdown.getParser;

// Remplacer la fonction getParser par notre version personnalisée
markdown.getParser = function() {
    // Obtenir le parser original
    const originalParser = originalGetParser();

    // Retourner une nouvelle fonction qui enveloppe le parser original
    return function(source) {
        // Augmenter les niveaux de titres dans le source (# -> ##, ## -> ###, etc.)
        const modifiedSource = source.replace(/^(#{1,6})/gm, '#$1');

        // Appeler le parser original avec le source modifié
        return originalParser(modifiedSource);
    };
};

/**
 * Only use comment blocks which has a @hook tag and simulate as @class.
 */

exports.handlers = {
    parseBegin: function() {
        // Rien à faire ici
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
