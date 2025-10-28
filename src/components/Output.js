import React from 'react';
import '../styles/Output.css';

const Output = ({output, isVisible, onClose}) => {
    if (!isVisible) return null;

    return (
        <div className="outputPanel">
            <div className="outputHeader">
                <h3>Output</h3>
                <button className="closeBtn" onClick={onClose}>×</button>
            </div>
            <div className="outputContent">
                {output.success === false && (
                    <div className="errorOutput">
                        <strong>Error:</strong>
                        <pre>{output.error}</pre>
                        {output.output && (
                            <>
                                <strong>Partial Output:</strong>
                                <pre>{output.output}</pre>
                            </>
                        )}
                    </div>
                )}
                {output.success === true && (
                    <div className="successOutput">
                        {output.output && (
                            <>
                                <strong>Output:</strong>
                                <pre>{output.output}</pre>
                            </>
                        )}
                        {output.error && (
                            <>
                                <strong>Warnings:</strong>
                                <pre className="warningText">{output.error}</pre>
                            </>
                        )}
                        {!output.output && !output.error && (
                            <div className="noOutput">Program executed successfully (no output)</div>
                        )}
                    </div>
                )}
                {output.timestamp && (
                    <div className="timestamp">
                        Executed at: {new Date(output.timestamp).toLocaleString()}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Output;
