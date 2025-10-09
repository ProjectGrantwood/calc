import { useState, useEffect, useRef, useCallback } from 'react'
import * as math from "mathjs"
import "katex/dist/katex.min.css"
import katex from "katex"
import githubIcon from "./assets/433-github.svg";
import linkedinIcon from "./assets/459-linkedin2.svg";

// Components related to self-advertisement :)

const IconLink = ({ imagePath, link }) => {
    return (
            <a className="mx-auto" href={ link } target="_blank" rel="noopener noreferrer">
                <img className="invert scale-125 md:scale-150" src={ imagePath }></img>
            </a>
    )
}

// Actual calculator components

// Wrap all KaTeX in a component with the useRef() hook because KaTeX is attached directly to the DOM and needs an element reference to function correctly.

const KaTeXDisplay = ({ displayString }) => {
    const ref = useRef(null);
    useEffect(() => { 
        katex.render(displayString, ref.current, { throwOnError: false }); 
    }, [displayString]);
    return (
        <span ref={ ref }></span>
    );
}

const DisplayArea = ({ expression, result, isError = false}) => {
    const resultColor = isError ? "text-red-700" : "text-gray-600"
    return (
        <div className="grid grid-cols-1 grid-rows-[50%_50%] items-center border border-white rounded-md col-span-4 bg-white/80 text-black text-xl md:text-3xl lg:text-5xl">
            <div className="text-left ms-2 md:ms-8 align-middle overflow-x-auto whitespace-nowrap">
                <KaTeXDisplay displayString={ expression } />
            </div>
            <div className={`text-right me-2 md:me-8 ${resultColor} align-middle overflow-x-auto whitespace-nowrap`}>
                <KaTeXDisplay displayString={ isError ? `\\text{${result}}` : result } />
            </div>
        </div>
        
    )
}

// Button components & some associated color classes

const BUTTON_COLORS = {
    "blue": "bg-blue-900/50 hover:bg-blue-900/70 active:bg-blue-900/90",
    "red": "bg-red-900/50 hover:bg-red-900/70 active:bg-red-900/90",
    "green": "bg-green-900/50 hover:bg-green-900/70 active:bg-green-900/90",
}

const InputButton = ({ char, onClick, color}) => {
    return (
        <button className={`col-span-1 border rounded-xl border-zinc-500/90 ${BUTTON_COLORS[color]}`} onClick={ () => onClick(char) }>
            <KaTeXDisplay displayString={ char } />
        </button>
    )
}

const ActionButton = ({ char, onClick, color, asText = false}) => {
    return (
        <button className={`col-span-1 border rounded-xl border-zinc-500/90 ${BUTTON_COLORS[color]}`} onClick={ onClick }>
            <KaTeXDisplay displayString={ asText ? `\\text{${char}}` : char } />
        </button>
    )
}

// Main component

function Calculator() {
    
    const [expressionAndResult, setExpressionAndResult] = useState({expression: [], result: [], needsReset: false})
    const [resultIsError, setResultIsError] = useState(false);
    const [previousNonErrorResult, setPreviousNonErrorResult] = useState(null);
    
    const handleNumberInput = useCallback((num) => {
        if (expressionAndResult.needsReset) {
            resetExpression([num])
        } else {
            setExpressionAndResult({expression: [...expressionAndResult.expression, num], result: [], needsReset: false})
        }
    }, [expressionAndResult.expression, expressionAndResult.needsReset])
    
    const handleOperationInput = useCallback((op) => {
        if (expressionAndResult.needsReset) {
            resetExpression([previousNonErrorResult !== null ? previousNonErrorResult: expressionAndResult.result[1], op])
        } else {
            setExpressionAndResult({expression: [...expressionAndResult.expression, op], result: [], needsReset: false})
        }
    }, [expressionAndResult.expression, expressionAndResult.result, expressionAndResult.needsReset, previousNonErrorResult])
    
    function resetExpression(newExpression) {
        setExpressionAndResult({expression: newExpression, result: [], needsReset: false})
        setResultIsError(false);
    }
    
    function clearInput() {
        setExpressionAndResult({expression: [], result: [], needsReset: false});
        setResultIsError(false);
    }
    
    const backspace = useCallback(() => {
        setExpressionAndResult({expression: expressionAndResult.expression.slice(0, -1), result: [], needsReset: false});
    }, [expressionAndResult.expression])
    
    function parseExpression(expression) {
        return expression.join("");
    }
    
    const computeExpression = useCallback(() => {
        let expressionParsed = parseExpression(expressionAndResult.expression);
        // math.js can't deal with the unicode symbols for multiplication and division that we're using for display, so we replace them with "*" and "/".
        expressionParsed = expressionParsed.replaceAll(/×/g, '*')
        expressionParsed = expressionParsed.replaceAll(/÷/g, '/')
        let resultOfComputation;
        try {
            resultOfComputation = math.evaluate(expressionParsed).toString();
        } catch (e) {
            setResultIsError(true);
            setExpressionAndResult({expression: [...expressionAndResult.expression], result: [`Error: ${e.message}`], needsReset: true});
            return;
        }
        // Convert the result to KaTeX text (instead of math display) for the rare case where the result is text, i.e. "Infinity"
        const resultDisplay = resultOfComputation.match(/[A-Za-z]+/g) ? `\\text{${resultOfComputation}}` : resultOfComputation
        setExpressionAndResult({expression: [...expressionAndResult.expression], result: ["=", resultDisplay], needsReset: true});
        setPreviousNonErrorResult(resultOfComputation);
    }, [expressionAndResult.expression])
    
    // Manage keyboard input for:
    //      The numbers 1-9
    //      "."
    //      "/"
    //      "-"
    //      shift + "=" (results in "+")
    //      shift + "8" (results in "*")
    //      shift + "9" (results in "(")
    //      shift + "0" (results in ")")
    //      "="
    //      "Backspace" and "Delete"
    
    useEffect(() => {
        const keyDownHandler = (e) => {
            if (e.shiftKey) {
                if (e.key.match(/[/(/)]/g)) {
                    handleNumberInput(e.key)
                } else if (e.key.match(/[/*/+]/)) {
                    if (e.key === "*") {
                        handleOperationInput("×")
                    } else {
                        handleOperationInput(e.key)
                    }
                } 
            } else if (e.key.match(/[\d./-]/g)) {
                if (e.key === "/") {
                    handleOperationInput("÷")
                } else if (e.key === "-") {
                    handleOperationInput(e.key)
                } else {
                    handleNumberInput(e.key)
                }
            } else if (e.key === "Backspace" || e.key === "Delete") {
                backspace();
            } else if (e.key === "=") {
                computeExpression()
            }
            return false;
        }
        window.addEventListener("keydown", keyDownHandler);
        return () => window.removeEventListener("keydown", keyDownHandler);
    }, [expressionAndResult, backspace, computeExpression, handleNumberInput, handleOperationInput])
    
    // the final Calculator component:
    
    return (
        <div className="font-sans min-h-svh grid grid-cols-[auto_minmax(300px,_90%)_auto] grid-rows-[auto_minmax(400px,_90%)_auto] text-3xl bg-black">
            <div className="col-span-3 row-span-1"></div>
            <div className="col-span-1 row-span-1"></div>
                <div className="col-span-1 row-span-1 grid grid-cols-4 md:grid-rows-[2fr_1fr_1fr_1fr_1fr_1fr] grid-rows-[80px_1fr_1fr_1fr_1fr_1fr] gap-6 p-6 bg-slate-900 border border-white/80 text-white">
                    <DisplayArea expression={ expressionAndResult.expression.length > 0 ? parseExpression(expressionAndResult.expression) : "" } result={ expressionAndResult.result.length > 0 ? parseExpression(expressionAndResult.result) : "" } isError={ resultIsError } />
                    <InputButton char="(" onClick= { handleOperationInput } color="blue" />
                    <InputButton char=")" onClick= { handleOperationInput } color="blue" />
                    <ActionButton char="⌫" onClick={ backspace } color = "red" />
                    <ActionButton char="AC" onClick={ clearInput } color = "red" asText= { true } />
                    <InputButton char="1" onClick={ handleNumberInput } color="blue" />
                    <InputButton char="2" onClick={ handleNumberInput } color="blue" />
                    <InputButton char="3" onClick={ handleNumberInput } color="blue" />
                    <InputButton char="+" onClick={ handleOperationInput } color="red" />
                    <InputButton char="4" onClick={ handleNumberInput } color="blue" />
                    <InputButton char="5" onClick={ handleNumberInput } color="blue" />
                    <InputButton char="6" onClick={ handleNumberInput } color="blue" />
                    <InputButton char="-" onClick={ handleOperationInput } color="red" />
                    <InputButton char="7" onClick={ handleNumberInput } color="blue" />
                    <InputButton char="8" onClick={ handleNumberInput } color="blue" />
                    <InputButton char="9" onClick={ handleNumberInput } color="blue" />
                    <InputButton char="×" onClick={ handleOperationInput } color="red" />
                    <InputButton char="0" onClick={ handleNumberInput } color="blue" />
                    <InputButton char="." onClick={ handleNumberInput } color="blue" />
                    <ActionButton char="=" onClick={ computeExpression } color="green" />
                    <InputButton char="÷" onClick={ handleOperationInput } color="red" />
                </div>
            <div className="col-span-1 row-span-1"></div>
            <div className="col-span-1 row-span-1"></div>
            <div className="grid grid-cols-2 grid-rows-1 col-span-1 row-span-1 align-middle mt-4 md:mt-10 text-center">
                <IconLink imagePath={ githubIcon } link="https://github.com/ProjectGrantwood" />
                <IconLink imagePath={ linkedinIcon } link="https://www.linkedin.com/in/jptphiladelphia/" />
            </div>
            <div className="col-span-1 row-span-1"></div>
            </div>
    )
}

export default Calculator
