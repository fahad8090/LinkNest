#!/bin/bash
echo "Functions inside editor.js:"
grep -o 'function [a-zA-Z0-9_]*' LinkNest/frontend/js/editor.js
echo "Let assignments inside editor.js:"
grep -o 'let [a-zA-Z0-9_]* =' LinkNest/frontend/js/editor.js
echo "Const assignments inside editor.js:"
grep -o 'const [a-zA-Z0-9_]* =' LinkNest/frontend/js/editor.js
