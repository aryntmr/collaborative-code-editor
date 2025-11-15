import React, {useEffect, useRef} from 'react';
import {language, cmtheme} from '../../src/atoms';
import {useRecoilValue} from 'recoil';
import ACTIONS from '../actions/Actions';

// CODE MIRROR
import Codemirror from 'codemirror';
import 'codemirror/lib/codemirror.css';

// theme
import 'codemirror/theme/3024-day.css';
import 'codemirror/theme/3024-night.css';
import 'codemirror/theme/abbott.css';
import 'codemirror/theme/abcdef.css';
import 'codemirror/theme/ambiance.css';
import 'codemirror/theme/ayu-dark.css';
import 'codemirror/theme/ayu-mirage.css';
import 'codemirror/theme/base16-dark.css';
import 'codemirror/theme/base16-light.css';
import 'codemirror/theme/bespin.css';
import 'codemirror/theme/blackboard.css';
import 'codemirror/theme/cobalt.css';
import 'codemirror/theme/colorforth.css';
import 'codemirror/theme/darcula.css';
import 'codemirror/theme/dracula.css';
import 'codemirror/theme/duotone-dark.css';
import 'codemirror/theme/duotone-light.css';
import 'codemirror/theme/eclipse.css';
import 'codemirror/theme/elegant.css';
import 'codemirror/theme/erlang-dark.css';
import 'codemirror/theme/gruvbox-dark.css';
import 'codemirror/theme/hopscotch.css';
import 'codemirror/theme/icecoder.css';
import 'codemirror/theme/idea.css';
import 'codemirror/theme/isotope.css';
import 'codemirror/theme/juejin.css';
import 'codemirror/theme/lesser-dark.css';
import 'codemirror/theme/liquibyte.css';
import 'codemirror/theme/lucario.css';
import 'codemirror/theme/material.css';
import 'codemirror/theme/material-darker.css';
import 'codemirror/theme/material-palenight.css';
import 'codemirror/theme/material-ocean.css';
import 'codemirror/theme/mbo.css';
import 'codemirror/theme/mdn-like.css';
import 'codemirror/theme/midnight.css';
import 'codemirror/theme/monokai.css';
import 'codemirror/theme/moxer.css';
import 'codemirror/theme/neat.css';
import 'codemirror/theme/neo.css';
import 'codemirror/theme/night.css';
import 'codemirror/theme/nord.css';
import 'codemirror/theme/oceanic-next.css';
import 'codemirror/theme/panda-syntax.css';
import 'codemirror/theme/paraiso-dark.css';
import 'codemirror/theme/paraiso-light.css';
import 'codemirror/theme/pastel-on-dark.css';
import 'codemirror/theme/railscasts.css';
import 'codemirror/theme/rubyblue.css';
import 'codemirror/theme/seti.css';
import 'codemirror/theme/shadowfox.css';
import 'codemirror/theme/solarized.css';
import 'codemirror/theme/the-matrix.css';
import 'codemirror/theme/tomorrow-night-bright.css';
import 'codemirror/theme/tomorrow-night-eighties.css';
import 'codemirror/theme/ttcn.css';
import 'codemirror/theme/twilight.css';
import 'codemirror/theme/vibrant-ink.css';
import 'codemirror/theme/xq-dark.css';
import 'codemirror/theme/xq-light.css';
import 'codemirror/theme/yeti.css';
import 'codemirror/theme/yonce.css';
import 'codemirror/theme/zenburn.css';

// modes
import 'codemirror/mode/clike/clike';
import 'codemirror/mode/css/css';
import 'codemirror/mode/dart/dart';
import 'codemirror/mode/django/django';
import 'codemirror/mode/dockerfile/dockerfile';
import 'codemirror/mode/go/go';
import 'codemirror/mode/htmlmixed/htmlmixed';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/jsx/jsx';
import 'codemirror/mode/markdown/markdown';
import 'codemirror/mode/php/php';
import 'codemirror/mode/python/python';
import 'codemirror/mode/r/r';
import 'codemirror/mode/rust/rust';
import 'codemirror/mode/ruby/ruby';
import 'codemirror/mode/sass/sass';
import 'codemirror/mode/shell/shell';
import 'codemirror/mode/sql/sql';
import 'codemirror/mode/swift/swift';
import 'codemirror/mode/xml/xml';
import 'codemirror/mode/yaml/yaml';

// features
import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/scroll/simplescrollbars.css';

//search
import 'codemirror/addon/search/search.js';
import 'codemirror/addon/search/searchcursor.js';
import 'codemirror/addon/search/jump-to-line.js';
import 'codemirror/addon/dialog/dialog.js';
import 'codemirror/addon/dialog/dialog.css';

// hints (autocomplete)
import 'codemirror/addon/hint/show-hint.js';
import 'codemirror/addon/hint/show-hint.css';

const Editor = ({socketRef, roomId, onCodeChange, username}) => {

    const editorRef = useRef(null);
    const cursorsRef = useRef({});
    const isRemoteUpdate = useRef(false);
    const aiCompletionTimeout = useRef(null);
    const aiRequestCounter = useRef(0);
    const lang = useRecoilValue(language);
    const editorTheme = useRecoilValue(cmtheme);

    // AI Completion Functions
    const requestAICompletion = (cm) => {
        if (!socketRef.current || !cm) return;
        
        const cursor = cm.getCursor();
        const code = cm.getValue();
        const currentLine = cm.getLine(cursor.line);
        
        // Only trigger if there's some meaningful content
        if (currentLine.trim().length < 2) return;
        
        const requestId = ++aiRequestCounter.current;
        
        console.log('[AI Completion] Requesting suggestions for:', { cursor, language: lang });
        
        socketRef.current.emit(ACTIONS.AI_CODE_COMPLETION, {
            roomId,
            code,
            language: lang,
            cursor,
            requestId
        });
    };

    const debouncedAICompletion = (cm) => {
        // Clear previous timeout
        if (aiCompletionTimeout.current) {
            clearTimeout(aiCompletionTimeout.current);
        }
        
        // Set new timeout for debounced completion
        aiCompletionTimeout.current = setTimeout(() => {
            requestAICompletion(cm);
        }, 300); // 300ms delay
    };

    const aiHintFunction = async (cm) => {
        return new Promise((resolve) => {
            const cursor = cm.getCursor();
            const requestId = ++aiRequestCounter.current;
            
            // Store the resolve function to call when response arrives
            const responseHandler = (data) => {
                console.log('[AI Hint] Response handler called:', { requestId, dataRequestId: data.requestId, match: data.requestId === requestId });
                
                if (data.requestId === requestId) {
                    socketRef.current.off(ACTIONS.AI_COMPLETION_RESPONSE, responseHandler);
                    
                    console.log('[AI Hint] Processing suggestions:', data.suggestions);
                    
                    if (data.success && data.suggestions.length > 0) {
                        // For AI completions, we want to insert at cursor position, not replace tokens
                        const hintData = {
                            list: data.suggestions.map(suggestion => ({
                                text: suggestion.text,
                                displayText: suggestion.displayText,
                                className: suggestion.className || 'ai-completion-suggestion'
                            })),
                            from: cursor, // Insert at current cursor position
                            to: cursor    // Don't replace any existing text
                        };
                        console.log('[AI Hint] Resolving with hint data:', hintData);
                        resolve(hintData);
                    } else {
                        console.log('[AI Hint] No suggestions or failed, resolving null');
                        resolve(null);
                    }
                }
            };
            
            socketRef.current.on(ACTIONS.AI_COMPLETION_RESPONSE, responseHandler);
            
            // Request completion
            socketRef.current.emit(ACTIONS.AI_CODE_COMPLETION, {
                roomId,
                code: cm.getValue(),
                language: lang,
                cursor,
                requestId
            });
            
            // Timeout after 5 seconds
            setTimeout(() => {
                socketRef.current.off(ACTIONS.AI_COMPLETION_RESPONSE, responseHandler);
                resolve(null);
            }, 5000);
        });
    };

    const shouldTriggerCompletion = (event) => {
        // Don't trigger on special keys
        if (event.ctrlKey || event.altKey || event.metaKey) return false;
        
        // Don't trigger on navigation keys
        const navigationKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'];
        if (navigationKeys.includes(event.key)) return false;
        
        // Don't trigger on function keys
        if (event.key.startsWith('F') && event.key.length > 1) return false;
        
        // Trigger on alphanumeric characters and some symbols
        return /[a-zA-Z0-9_.$]/.test(event.key);
    };

    useEffect(() => {
        async function init() {
            editorRef.current = Codemirror.fromTextArea(
                document.getElementById('realtimeEditor'),
                {
                    mode: {name: lang},
                    theme: editorTheme,
                    autoCloseTags: true,
                    autoCloseBrackets: true,
                    lineNumbers: true,
                    extraKeys: {
                        'Ctrl-Space': 'autocomplete',
                        'Cmd-Space': 'autocomplete'
                    }
                }
            );

            // Set up AI hint function after CodeMirror is created
            editorRef.current.setOption('hintOptions', {
                hint: aiHintFunction,
                completeSingle: false,
                alignWithWord: true,
                closeOnUnfocus: false
            });

            console.log('[Editor] CodeMirror initialized with AI hints');

            editorRef.current.on('change', (instance, changes) => {
                const {origin} = changes;
                const code = instance.getValue();
                onCodeChange(code);
                if (origin !== 'setValue') {
                    console.log('[Editor] Code changed, emitting CODE_CHANGE to room:', roomId);
                    socketRef.current.emit(ACTIONS.CODE_CHANGE, {
                        roomId,
                        code,
                    });
                }
            });

            // Track cursor position changes
            editorRef.current.on('cursorActivity', (instance) => {
                // Don't emit cursor changes during remote updates
                if (isRemoteUpdate.current) {
                    console.log('[Editor] Skipping cursor emission during remote update');
                    return;
                }
                
                const cursor = instance.getCursor();
                console.log('[Editor] Cursor moved, emitting CURSOR_CHANGE to room:', roomId, 'cursor:', cursor);
                socketRef.current.emit(ACTIONS.CURSOR_CHANGE, {
                    roomId,
                    cursor: {line: cursor.line, ch: cursor.ch},
                    username: username,
                });
            });

            // AI Completion on keyup
            editorRef.current.on('keyup', (instance, event) => {
                // Don't trigger during remote updates
                if (isRemoteUpdate.current) return;
                
                // Check if we should trigger AI completion
                if (shouldTriggerCompletion(event)) {
                    console.log('[Editor] Triggering AI completion for key:', event.key);
                    debouncedAICompletion(instance);
                    
                    // Also show manual hints for testing
                    setTimeout(() => {
                        console.log('[Editor] Manually showing hints');
                        instance.showHint();
                    }, 400);
                }
            });

        }
        init();
    }, [lang]);

    useEffect(() => {
        if (socketRef.current) {
            console.log('[Editor] Setting up socket listeners, socket.id:', socketRef.current.id);
            
            const handleCodeChange = ({code}) => {
                console.log('[Editor] Received CODE_CHANGE, current code length:', editorRef.current?.getValue().length, 'new code length:', code?.length);
                
                if (code !== null && editorRef.current) {
                    const currentCode = editorRef.current.getValue();
                    
                    // Only update if code is different
                    if (currentCode === code) {
                        console.log('[Editor] Code is same, skipping update');
                        return;
                    }
                    
                    console.log('[Editor] Updating editor with new code');
                    // Set flag to prevent cursor emission during remote update
                    isRemoteUpdate.current = true;
                    
                    const currentCursor = editorRef.current.getCursor();
                    editorRef.current.setValue(code);
                    editorRef.current.setCursor(currentCursor);
                    
                    // Reset flag immediately (synchronously)
                    isRemoteUpdate.current = false;
                }
            };

            const handleCursorChange = ({socketId, cursor, username}) => {
                console.log('[Editor] Received CURSOR_CHANGE from socketId:', socketId, 'my socket.id:', socketRef.current?.id);
                
                if (!editorRef.current) return;
                
                // Skip if this is our own cursor (check against socket.io's id)
                if (socketRef.current && socketId === socketRef.current.id) {
                    console.log('[Editor] Skipping own cursor');
                    return;
                }

                console.log('[Editor] Displaying remote cursor for', username, 'at', cursor);
                
                // Remove old cursor if exists
                if (cursorsRef.current[socketId]) {
                    cursorsRef.current[socketId].clear();
                }

                // Create cursor widget
                const cursorElement = document.createElement('span');
                cursorElement.className = 'remote-cursor';
                cursorElement.style.borderLeftColor = getColorForUser(socketId);
                
                const label = document.createElement('span');
                label.className = 'remote-cursor-label';
                label.textContent = username;
                label.style.backgroundColor = getColorForUser(socketId);
                cursorElement.appendChild(label);

                // Mark the cursor position - use insertLeft: false to avoid breaking text
                const bookmark = editorRef.current.setBookmark(cursor, {
                    widget: cursorElement,
                    insertLeft: false,
                });

                cursorsRef.current[socketId] = bookmark;
            };

            const handleDisconnected = ({socketId}) => {
                console.log('[Editor] User disconnected:', socketId);
                if (cursorsRef.current[socketId]) {
                    cursorsRef.current[socketId].clear();
                    delete cursorsRef.current[socketId];
                }
            };

            const handleAICompletionResponse = ({requestId, suggestions, success, error}) => {
                console.log('[AI Completion] Received response:', { requestId, success, suggestions: suggestions?.length, error });
                
                if (!success) {
                    console.error('[AI Completion] Error:', error);
                    return;
                }
                
                console.log('[AI Completion] Full suggestions:', suggestions);
                // The response is handled by the aiHintFunction promise
                // This is just for logging and potential future enhancements
            };
            
            socketRef.current.on(ACTIONS.CODE_CHANGE, handleCodeChange);
            socketRef.current.on(ACTIONS.CURSOR_CHANGE, handleCursorChange);
            socketRef.current.on(ACTIONS.DISCONNECTED, handleDisconnected);
            socketRef.current.on(ACTIONS.AI_COMPLETION_RESPONSE, handleAICompletionResponse);

            return () => {
                console.log('[Editor] Cleaning up socket listeners');
                if (socketRef.current) {
                    socketRef.current.off(ACTIONS.CODE_CHANGE, handleCodeChange);
                    socketRef.current.off(ACTIONS.CURSOR_CHANGE, handleCursorChange);
                    socketRef.current.off(ACTIONS.DISCONNECTED, handleDisconnected);
                    socketRef.current.off(ACTIONS.AI_COMPLETION_RESPONSE, handleAICompletionResponse);
                }
                
                // Clear AI completion timeout
                if (aiCompletionTimeout.current) {
                    clearTimeout(aiCompletionTimeout.current);
                }
            };
        }
    }, [socketRef.current]);

    // Generate consistent colors for users
    function getColorForUser(socketId) {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
            '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
        ];
        const hash = socketId.split('').reduce((acc, char) => {
            return char.charCodeAt(0) + ((acc << 5) - acc);
        }, 0);
        return colors[Math.abs(hash) % colors.length];
    }

    return (
        <textarea id="realtimeEditor"></textarea>
    );
};

export default Editor;