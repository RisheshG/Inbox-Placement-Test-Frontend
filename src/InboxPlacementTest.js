import React, { useState, useEffect } from "react";
import axios from "axios";
import "./InboxPlacementTest.css";

const InboxPlacementTest = () => {
  const [testCode, setTestCode] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [user, setUser] = useState(null);
  const [credits, setCredits] = useState(0);
  const [isLogin, setIsLogin] = useState(true);
  const [emailAnalysis, setEmailAnalysis] = useState(null);
  const [analyzingEmail, setAnalyzingEmail] = useState(false);
  const [analysisReady, setAnalysisReady] = useState(false);
  const recipients = `
  Patricia@emaildeliveryreport.com,
  l.Patricia@emaildeliveryreport.net,
  lindaPatricia@xemaildeliveryreport.com,
  Linda@xemaildeliveryreport.com,
  linda.patricia@xemaildeliveryreport.com,
  brijesh@xleadoutreach.com,
  mahendra@xleadsconsulting.com,
  lakhendra@xleadsconsulting.com,
  xgrowthtech@xleadsconsulting.com,
  audit@xleadoutreach.com,
  houseisitter@gmail.com,
  malaikaarora983475@gmail.com,
  rheadutta096@gmail.com,
  tmm003937@gmail.com,
  mta872679@gmail.com
`;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      validateToken(token);
    }
  }, []);

  const validateToken = async (token) => {
    try {
      const response = await axios.get("https://inbox-placement-test-backend.onrender.com/user", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(response.data.email);
      setCredits(response.data.credits);
    } catch (err) {
      console.error("Failed to validate token:", err.message);
      localStorage.removeItem("token");
    }
  };

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => {
        setFeedback("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const handleRegister = async (email, password) => {
    try {
      const response = await axios.post("https://inbox-placement-test-backend.onrender.com/register", {
        email,
        password,
      });
      setFeedback("Registration successful. Please login.");
      setIsLogin(true);
    } catch (err) {
      setError("Registration failed. Please try again.");
    }
  };

  const handleLogin = async (email, password) => {
    try {
      const response = await axios.post("https://inbox-placement-test-backend.onrender.com/login", {
        email,
        password,
      });
      localStorage.setItem("token", response.data.token);
      setUser(email);
      setCredits(response.data.credits);
      setFeedback("Login successful.");
    } catch (err) {
      setError("Login failed. Please check your credentials.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setCredits(0);
    setFeedback("Logged out successfully.");
  };

  const handleGenerateTestCode = async () => {
    if (!user) {
      setError("Please login to generate a test code.");
      return;
    }

    setLoading(true);
    setError("");
    setAnalysisReady(false);

    try {
      const response = await axios.post(
        "https://inbox-placement-test-backend.onrender.com/generate-test-code",
        { recipients },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setTestCode(response.data.testCode);
      setError("");
    } catch (err) {
      setError("Failed to generate test code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGetResults = async () => {
    if (!testCode) {
      setError("No test code available. Please generate one first.");
      return;
    }
  
    if (credits < 1) {
      setError("Insufficient credits. Please purchase more credits.");
      return;
    }
  
    setProcessing(true);
    setError("");
    setResults([]); // Clear previous results
  
    try {
      await axios.post(
        "https://inbox-placement-test-backend.onrender.com/check-mails",
        { testCode },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
  
      const token = localStorage.getItem("token");
      const eventSource = new EventSource(
        `https://inbox-placement-test-backend.onrender.com/results-stream/${testCode}?token=${token}`
      );
  
      eventSource.onmessage = (event) => {
        const { email, status } = JSON.parse(event.data);
        console.log(`Received update for ${email}: ${status}`); // Debug log
  
        setResults((prevResults) => {
          // Check if we already have this result
          const existingIndex = prevResults.findIndex(
            (result) => result.email.toLowerCase() === email.toLowerCase()
          );
  
          if (existingIndex >= 0) {
            // Update existing result
            const newResults = [...prevResults];
            newResults[existingIndex] = { email, status };
            return newResults;
          } else {
            // Add new result
            return [...prevResults, { email, status }];
          }
        });
  
        // Enable analysis when tmm003937@gmail.com has a result
        if (email.toLowerCase() === "tmm003937@gmail.com" && (status === "Inbox" || status === "Spam")) {
          setAnalysisReady(true);
        }
      };
  
      eventSource.onerror = (error) => {
        console.error("SSE error:", error);
        eventSource.close();
        setProcessing(false);
      };
  
      // Close connection after 5 minutes
      setTimeout(() => {
        eventSource.close();
        setProcessing(false);
      }, 300000);
  
    } catch (err) {
      console.error("Error in handleGetResults:", err);
      setError("Failed to fetch results. Please try again.");
      setProcessing(false);
    }
  };

  const handleAnalyzeEmail = async () => {
    if (!testCode) {
      setError("No test code available. Please generate one first.");
      return;
    }

    setAnalyzingEmail(true);
    setError("");

    try {
      const response = await axios.get(
        `https://inbox-placement-test-backend.onrender.com/get-latest-analysis/${testCode}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );

      if (response.data) {
        const analysis = {
          ...response.data,
          from: response.data.fromEmail || "Unknown Sender",
          linkCount: response.data.linkStatuses ? response.data.linkStatuses.length : 0,
        };

        setEmailAnalysis(analysis);
      } else {
        setError("No analysis found for this test code.");
      }
    } catch (err) {
      setError("Failed to fetch email analysis. Please try again.");
    } finally {
      setAnalyzingEmail(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setFeedback("Copied to clipboard!");
    } catch (err) {
      setFeedback("Failed to copy to clipboard.");
    }
  };

  const parseEmailContent = (content) => {
    if (!content) return "No content available.";

    const cleanedContent = content
      .replace(/--[0-9a-f]+/g, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\n+/g, "\n")
      .replace(/charset="UTF-8"/gi, "")
      .trim();

    const plainTextMatch = cleanedContent.match(/Content-Type: text\/plain;[\s\S]*?([\s\S]*?)(Content-Type:|$)/i);
    const plainText = plainTextMatch ? plainTextMatch[1].trim() : cleanedContent;

    return plainText || "No readable content found.";
  };

  return (
    <div>
      {/* Feedback Message */}
      {feedback && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            padding: "10px 20px",
            backgroundColor: "#4CAF50",
            color: "white",
            borderRadius: "5px",
            boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
          }}
        >
          {feedback}
        </div>
      )}

      {/* Login/Register Section */}
      {!user ? (
        <div style={{ marginBottom: "20px" }}>
          <h2>{isLogin ? "Login" : "Register"}</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const email = e.target.email.value;
              const password = e.target.password.value;
              if (isLogin) {
                handleLogin(email, password);
              } else {
                handleRegister(email, password);
              }
            }}
          >
            <input
              type="email"
              name="email"
              placeholder="Email"
              required
              style={{ marginBottom: "10px", padding: "5px" }}
            />
            <br />
            <input
              type="password"
              name="password"
              placeholder="Password"
              required
              style={{ marginBottom: "10px", padding: "5px" }}
            />
            <br />
            <button type="submit" style={{ padding: "5px 10px" }}>
              {isLogin ? "Login" : "Register"}
            </button>
          </form>
          <button
            onClick={() => setIsLogin(!isLogin)}
            style={{ marginTop: "10px", padding: "5px 10px" }}
          >
            {isLogin ? "Switch to Register" : "Switch to Login"}
          </button>
        </div>
      ) : (
        <div style={{ marginBottom: "20px" }}>
          <p>
            Welcome, {user}! Credits: {credits}
          </p>
          <button onClick={handleLogout} style={{ padding: "5px 10px" }}>
            Logout
          </button>
        </div>
      )}

      {/* Generate Test Code Section */}
      {user && (
        <div style={{ marginBottom: "20px" }}>
          <button onClick={handleGenerateTestCode} disabled={loading || processing}>
            {loading ? "Generating..." : "Generate Test Code"}
          </button>
        </div>
      )}

      {/* Display Test Code and Recipients */}
      {testCode && (
        <div style={{ marginBottom: "20px" }}>
          <p>
            <strong>Test Code:</strong> {testCode}
            <button
              onClick={() => copyToClipboard(testCode)}
              style={{ marginLeft: "10px", padding: "5px 10px" }}
            >
              Copy Test Code
            </button>
          </p>
          <p>
            <strong>Recipients:</strong> {recipients}
            <button
              onClick={() => copyToClipboard(recipients)}
              style={{ marginLeft: "10px", padding: "5px 10px" }}
            >
              Copy Email Addresses
            </button>
          </p>
          <p>
            Copy the test code and send emails to the recipients. Then, click "Get Results" below.
          </p>
        </div>
      )}

      {/* Get Results and Analyze Email Buttons */}
      {testCode && (
        <div style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
          <button onClick={handleGetResults} disabled={loading || processing}>
            {processing ? "Processing..." : "Get Results"}
          </button>
          <button
            onClick={handleAnalyzeEmail}
            disabled={!analysisReady || analyzingEmail}
          >
            {analyzingEmail ? "Analyzing..." : "Analyze Email"}
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Results Table */}
      {results.length > 0 && (
  <div style={{ marginBottom: "20px" }}>
    <h2>Results</h2>
    <table border="1" cellPadding="10" cellSpacing="0">
      <thead>
        <tr>
          <th>Email</th>
          <th>ESP</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {recipients
          .split(",")
          .map(email => email.trim())
          .filter(email => email)
          .map((email, index) => {
            // Find any result that matches this email (case insensitive)
            const result = results.find((result) => 
              result.email.toLowerCase() === email.toLowerCase()
            );

            // Determine ESP type
            const getESP = (email) => {
              if (email.includes('@gmail.com')) {
                // Check if it's a pro-gmail account
                const proGmails = [
                  'Patricia@emaildeliveryreport.com',
                  'l.Patricia@emaildeliveryreport.net',
                  'lindaPatricia@xemaildeliveryreport.com',
                  'Linda@xemaildeliveryreport.com',
                  'linda.patricia@xemaildeliveryreport.com'
                ];
                return proGmails.includes(email) ? 'pro-gmail' : 'gmail';
              }
              // Check if it's a pro-outlook account
              const proOutlooks = [
                'brijesh@xleadoutreach.com',
                'mahendra@xleadsconsulting.com',
                'lakhendra@xleadsconsulting.com',
                'xgrowthtech@xleadsconsulting.com',
                'audit@xleadoutreach.com'
              ];
              return proOutlooks.includes(email) ? 'pro-outlook' : 'pro-gmail';
            };

            const esp = getESP(email);
            
            return (
              <tr key={index}>
                <td>{email}</td>
                <td>
                  <span style={{
                    padding: '3px 6px',
                    borderRadius: '3px',
                    backgroundColor: 
                      esp === 'pro-gmail' ? '#e3f2fd' :
                      esp === 'pro-outlook' ? '#e8f5e9' :
                      '#fff8e1',
                    color: '#000',
                    fontWeight: 'bold'
                  }}>
                    {esp}
                  </span>
                </td>
                <td>
                  {result ? (
                    <>
                      {result.status === "Inbox" && "✅ Inbox"}
                      {result.status === "Spam" && "⚠️ Spam"}
                      {result.status === "Not Found" && "❌ Not Found"}
                      {result.status === "Error" && "❓ Error"}
                    </>
                  ) : (
                    "Processing..."
                  )}
                </td>
              </tr>
            );
          })}
      </tbody>
    </table>
  </div>
)}

      {/* Email Analysis Section */}
      {emailAnalysis && !emailAnalysis.error && (
        <div style={{ marginTop: "20px" }}>
          <h2>Email Analysis</h2>
          <div style={{ border: "1px solid #ccc", padding: "15px", borderRadius: "5px" }}>
            {/* Authentication */}
            <h3>Authentication</h3>
            <details>
              <summary>
                {emailAnalysis.authentication?.dkim === "pass" &&
                emailAnalysis.authentication?.spf === "pass" &&
                emailAnalysis.authentication?.dmarc === "pass" &&
                emailAnalysis.authentication?.mxRecords === "pass"
                  ? "Pass"
                  : "Fail"}
              </summary>
              <table border="1" cellPadding="10" cellSpacing="0" style={{ marginBottom: "15px", width: "100%" }}>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>DKIM</td>
                    <td>{emailAnalysis.authentication?.dkim === "pass" ? "Pass" : "Fail"}</td>
                  </tr>
                  <tr>
                    <td>SPF</td>
                    <td>{emailAnalysis.authentication?.spf === "pass" ? "Pass" : "Fail"}</td>
                  </tr>
                  <tr>
                    <td>DMARC</td>
                    <td>{emailAnalysis.authentication?.dmarc === "pass" ? "Pass" : "Fail"}</td>
                  </tr>
                  <tr>
                    <td>MX</td>
                    <td>{emailAnalysis.authentication?.mxRecords === "pass" ? "Pass" : "Fail"}</td>
                  </tr>
                </tbody>
              </table>
            </details>

            {/* Domain Blacklist Check */}
            <h3>Domain Blacklist Check</h3>
            <details>
              <summary>
                {emailAnalysis.domainBlacklistCheck?.some(result => result.listed)
                  ? `Your domain is blacklisted on ${emailAnalysis.domainBlacklistCheck.filter(result => result.listed).length} blacklist(s).`
                  : "Your domain is not blacklisted on major blacklists."}
              </summary>
              <table border="1" cellPadding="10" cellSpacing="0" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Blacklist</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {emailAnalysis.domainBlacklistCheck?.map((result, index) => (
                    <tr key={index}>
                      <td>{result.blacklist}</td>
                      <td>{result.listed ? "Listed" : "Not Listed"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>

            {/* IP Blacklist Check */}
            <h3>IP Blacklist Check</h3>
            <details>
              <summary>
                {emailAnalysis.ipBlacklistCheck?.some(result => result.listed)
                  ? `Your IP is blacklisted on ${emailAnalysis.ipBlacklistCheck.filter(result => result.listed).length} blacklist(s).`
                  : "Your IP is not blacklisted on major blacklists."}
              </summary>
              <table border="1" cellPadding="10" cellSpacing="0" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Blacklist</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {emailAnalysis.ipBlacklistCheck?.map((result, index) => (
                    <tr key={index}>
                      <td>{result.blacklist}</td>
                      <td>{result.listed ? "Listed" : "Not Listed"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>

            {/* Email Details */}
            <h3>Email Details</h3>
            <details>
              <summary>View Email Details</summary>
              <p><strong>Subject:</strong> {emailAnalysis.subject || "No Subject"}</p>
              <p><strong>From:</strong> {emailAnalysis.from || "Unknown Sender"}</p>
              <p><strong>Date:</strong> {emailAnalysis.date || "Unknown Date"}</p>
              <p><strong>Number of Links:</strong> {emailAnalysis.linkCount || 0}</p>
            </details>

            {/* Link Statuses */}
            {emailAnalysis.linkStatuses && emailAnalysis.linkStatuses.length > 0 && (
              <div>
                <h3>Link Statuses</h3>
                <details>
                  <summary>{emailAnalysis.linkStatuses.length} Links (Click to View Statuses)</summary>
                  <ul>
                    {emailAnalysis.linkStatuses.map((linkStatus, index) => (
                      <li key={index}>
                        <a href={linkStatus.link} target="_blank" rel="noopener noreferrer">
                          {linkStatus.link}
                        </a> - {linkStatus.status}
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            )}

            {/* Spam Word Analysis */}
            {emailAnalysis.spamWordAnalysis ? (
              <div style={{ marginTop: "20px" }}>
                <h3>Spam Word Analysis</h3>
                <p>
                  <strong>Spam Words Found:</strong>{" "}
                  {emailAnalysis.spamWordAnalysis.spamWordsFound ? "Yes" : "No"}
                </p>
                {emailAnalysis.spamWordAnalysis.spamWordsFound && (
                  <details>
                    <summary>View Spam Words</summary>
                    <ul>
                      {emailAnalysis.spamWordAnalysis.spamWordsList.map((word, index) => (
                        <li key={index}>{word}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            ) : (
              <p>Spam word analysis unavailable.</p>
            )}

            {/* Email Content */}
            <h3>Email Content</h3>
            <details>
              <summary>View Email Content</summary>
              <div
                style={{
                  backgroundColor: "#f5f5f5",
                  padding: "15px",
                  borderRadius: "5px",
                  whiteSpace: "pre-wrap",
                  maxHeight: "300px",
                  overflowY: "auto",
                }}
                dangerouslySetInnerHTML={{
                  __html: parseEmailContent(emailAnalysis.emailContent),
                }}
              />
            </details>
          </div>
        </div>
      )}
    </div>
  );
};

export default InboxPlacementTest;
