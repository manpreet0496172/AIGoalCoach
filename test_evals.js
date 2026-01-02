#!/usr/bin/env node

/**
 * AI Goal Coach - Mini Evaluation Suite (Node.js Version)
 * Tests the goal refinement API with various inputs including edge cases.
 */

import axios from 'axios';

// ============ CONFIGURATION ============
const API_BASE_URL = "http://localhost:3000/api";
const TEST_RESULTS = {
    passed: 0,
    failed: 0,
    tests: []
};

// ============ HELPER FUNCTIONS ============

function colored(text, color) {
    const colors = {
        green: '\x1b[92m',
        red: '\x1b[91m',
        yellow: '\x1b[93m',
        blue: '\x1b[94m',
        reset: '\x1b[0m'
    };
    return `${colors[color] || ''}${text}${colors.reset}`;
}

function printTestHeader(testName, testInput) {
    console.log(`\n${colored('─'.repeat(60), 'blue')}`);
    console.log(`${colored(`Test: ${testName}`, 'blue')}`);
    console.log(`Input: ${colored(JSON.stringify(testInput), 'yellow')}`);
    console.log(`${colored('─'.repeat(60), 'blue')}`);
}

function assertValidJsonSchema(responseJson, testName) {
    const errors = [];

    // Check required fields
    const requiredFields = ["refined_goal", "key_results", "confidence_score"];
    for (const field of requiredFields) {
        if (!(field in responseJson)) {
            errors.push(`Missing required field: ${field}`);
        }
    }

    // Validate refined_goal
    if ("refined_goal" in responseJson) {
        if (typeof responseJson.refined_goal !== 'string') {
            errors.push("refined_goal must be a string");
        } else if (responseJson.refined_goal.trim().length === 0) {
            errors.push("refined_goal cannot be empty");
        }
    }

    // Validate key_results
    if ("key_results" in responseJson) {
        if (!Array.isArray(responseJson.key_results)) {
            errors.push("key_results must be an array");
        } else if (responseJson.key_results.length === 0) {
            errors.push("key_results cannot be empty");
        } else if (responseJson.key_results.length > 5) {
            errors.push("key_results cannot have more than 5 items");
        } else {
            responseJson.key_results.forEach((kr, i) => {
                if (typeof kr !== 'string' || kr.trim().length === 0) {
                    errors.push(`key_results[${i}] must be a non-empty string`);
                }
            });
        }
    }

    // Validate confidence_score
    if ("confidence_score" in responseJson) {
        if (typeof responseJson.confidence_score !== 'number') {
            errors.push("confidence_score must be a number");
        } else if (responseJson.confidence_score < 1 || responseJson.confidence_score > 10) {
            errors.push("confidence_score must be between 1 and 10");
        }
    }

    return errors;
}

async function runTest(testName, testInput, expectedConfidenceMin = null) {
    printTestHeader(testName, testInput);

    try {
        const response = await axios.post(`${API_BASE_URL}/goals/refine`, 
            { goal: testInput }, 
            { timeout: 10000 }
        );

        console.log(`Status Code: ${colored(response.status, 'yellow')}`);

        const responseJson = response.data;

        // Check API success flag
        if ("success" in responseJson && !responseJson.success) {
            console.log("API returned success=false");
            console.log(`Error: ${responseJson.error || 'Unknown error'}`);
            // For low-confidence inputs, this is expected
            if (expectedConfidenceMin && expectedConfidenceMin < 3) {
                console.log(colored("✓ PASSED", "green"), "- Correctly rejected low-confidence input");
                TEST_RESULTS.passed++;
                TEST_RESULTS.tests.push({
                    name: testName,
                    passed: true,
                    confidence: responseJson.data?.confidence_score || 0
                });
                return;
            }
        }

        // Validate schema
        const data = responseJson.data || responseJson;
        const schemaErrors = assertValidJsonSchema(data, testName);

        if (schemaErrors.length > 0) {
            console.log(colored("✗ FAILED", "red"), "- Schema validation failed:");
            schemaErrors.forEach(error => console.log(`  - ${error}`));
            TEST_RESULTS.failed++;
            TEST_RESULTS.tests.push({
                name: testName,
                passed: false,
                errors: schemaErrors
            });
        } else {
            // Success!
            const confidence = data.confidence_score || 0;
            console.log(`\n${colored('Response Preview:', 'blue')}`);
            console.log(`Refined Goal: ${(data.refined_goal || 'N/A').substring(0, 80)}...`);
            console.log(`Key Results Count: ${(data.key_results || []).length}`);
            console.log(`Confidence Score: ${confidence}/10`);

            console.log(`\n${colored('✓ PASSED', 'green')} - Valid schema and all fields present`);
            TEST_RESULTS.passed++;
            TEST_RESULTS.tests.push({
                name: testName,
                passed: true,
                confidence: confidence
            });
        }

    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log(colored("✗ FAILED", "red"), "- Cannot connect to server");
            console.log("Make sure the server is running: npm run dev");
        } else if (error.response) {
            // Handle HTTP errors
            console.log(colored("✗ FAILED", "red"), `- HTTP Error: ${error.response.status}`);
            try {
                const errorData = typeof error.response.data === 'string' 
                    ? JSON.parse(error.response.data) 
                    : error.response.data;
                console.log(`Error: ${errorData.error || 'Unknown error'}`);
            } catch (e) {
                console.log(`Error: ${error.response.data}`);
            }
        } else {
            console.log(colored("✗ FAILED", "red"), `- Exception: ${error.message}`);
        }
        TEST_RESULTS.failed++;
        TEST_RESULTS.tests.push({
            name: testName,
            passed: false,
            error: error.message
        });
    }
}

// ============ TEST CASES ============

async function runAllTests() {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(colored("  AI Goal Coach - Mini Evaluation Suite", "blue"));
    console.log(`${'═'.repeat(60)}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`API Base URL: ${API_BASE_URL}\n`);

    // Normal test cases
    console.log(colored("\n▶ NORMAL TEST CASES", "blue"));
    
    await runTest(
        "Valid Goal - Sales",
        "I want to get better at sales",
        7
    );

    await runTest(
        "Valid Goal - Learning Programming",
        "I want to learn programming and become a professional developer",
        7
    );

    await runTest(
        "Valid Goal - Fitness",
        "I want to start exercising regularly and improve my fitness",
        7
    );

    // Edge cases and adversarial tests
    console.log(colored("\n▶ EDGE CASES & ADVERSARIAL TEST CASES", "blue"));

    await runTest(
        "Adversarial - SQL Injection Attempt",
        "'; DROP TABLE goals; --",
        1
    );

    await runTest(
        "Adversarial - Random Characters",
        "kjsfdkj lhj hsdlfk",
        1
    );

    await runTest(
        "Adversarial - Gibberish",
        "asdfghjkl qwerty zxcvbnm",
        1
    );

    await runTest(
        "Edge Case - Empty String",
        "",
        1
    );

    await runTest(
        "Edge Case - Only Whitespace",
        "   \n\t  ",
        1
    );

    await runTest(
        "Edge Case - Single Character",
        "a",
        1
    );

    await runTest(
        "Edge Case - Very Long Input",
        "I want to " + "do something".repeat(50),
        5
    );

    // Print summary
    return printSummary();
}

function printSummary() {
    const total = TEST_RESULTS.passed + TEST_RESULTS.failed;
    const successRate = total > 0 ? (TEST_RESULTS.passed / total * 100) : 0;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(colored("  TEST SUMMARY", "blue"));
    console.log(`${'═'.repeat(60)}`);
    console.log(`Total Tests: ${total}`);
    console.log(`${colored(`Passed: ${TEST_RESULTS.passed}`, 'green')}`);
    console.log(`${colored(`Failed: ${TEST_RESULTS.failed}`, TEST_RESULTS.failed > 0 ? 'red' : 'green')}`);
    console.log(`Success Rate: ${colored(`${successRate.toFixed(1)}%`, successRate >= 80 ? 'green' : 'red')}`);

    // Detailed results
    if (TEST_RESULTS.tests.length > 0) {
        console.log(`\n${colored('Detailed Results:', 'blue')}`);
        TEST_RESULTS.tests.forEach(test => {
            const status = test.passed ? colored("✓", "green") : colored("✗", "red");
            const confidence = test.passed ? ` (confidence: ${test.confidence || '?'}/10)` : "";
            console.log(`  ${status} ${test.name}${confidence}`);
        });
    }

    console.log(`\n${colored('─'.repeat(60), 'blue')}`);
    if (TEST_RESULTS.failed === 0) {
        console.log(colored("✓ All tests passed!", "green"));
    } else {
        console.log(colored(`✗ ${TEST_RESULTS.failed} test(s) failed`, "red"));
    }
    
    console.log(`${'═'.repeat(60)}\n`);

    // Return results instead of exiting
    return {
        total,
        passed: TEST_RESULTS.passed,
        failed: TEST_RESULTS.failed,
        successRate,
        tests: TEST_RESULTS.tests
    };
}

// ============ MAIN ============

runAllTests().catch(error => {
    console.log(`\n${colored('Test interrupted by error', 'yellow')}`);
    console.log(error.message);
    process.exit(1);
});

export { runTest, runAllTests, assertValidJsonSchema };
