import React, { useState, useEffect } from "react";
import axios from "axios";

const PreviousResults = () => {
  const [previousTests, setPreviousTests] = useState([]);
  const [fetchingPreviousTests, setFetchingPreviousTests] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1); // Track current page
  const [itemsPerPage] = useState(20); // Number of items per page

  const fetchPreviousTests = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Please login to view previous tests.");
      return;
    }

    setFetchingPreviousTests(true);
    setError("");

    try {
      const response = await axios.get(
        "http://localhost:3000/get-previous-tests",
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Filter out tests where all results have an empty or "Not Found" status
      const filteredTests = response.data.filter((test) => {
        return test.results.some((result) => result.status && result.status !== "Not Found");
      });

      setPreviousTests(filteredTests);
    } catch (err) {
      setError("Failed to fetch previous tests. Please try again.");
    } finally {
      setFetchingPreviousTests(false);
    }
  };

  useEffect(() => {
    fetchPreviousTests();
  }, []);

  // Calculate paginated data
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = previousTests.slice(indexOfFirstItem, indexOfLastItem);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Go to next page
  const nextPage = () => {
    if (currentPage < Math.ceil(previousTests.length / itemsPerPage)) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Go to previous page
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
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
      <h2>Previous IPT Tests</h2>
      {fetchingPreviousTests && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Pagination Controls */}
      <div style={{ marginBottom: "20px" }}>
        <button onClick={prevPage} disabled={currentPage === 1}>
          Previous
        </button>
        <span style={{ margin: "0 10px" }}>
          Page {currentPage} of {Math.ceil(previousTests.length / itemsPerPage)}
        </span>
        <button
          onClick={nextPage}
          disabled={currentPage === Math.ceil(previousTests.length / itemsPerPage)}
        >
          Next
        </button>
      </div>

      {/* Display Paginated Results */}
      {currentItems.length > 0 && (
        <div>
          {currentItems.map((test, index) => (
            <div key={index} style={{ border: "1px solid #ccc", padding: "15px", borderRadius: "5px", marginBottom: "20px" }}>
              <h3>Test Code: {test.testCode}</h3>
              <p><strong>Sent From:</strong> {test.sendingEmail}</p>

              {/* Results Table */}
              <h4>Results</h4>
              <table border="1" cellPadding="10" cellSpacing="0">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {test.results.map((result, idx) => (
                    <tr key={idx}>
                      <td>{result.email}</td>
                      <td>{result.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Display Analysis for Each Result */}
              {test.results.map((result, idx) => (
                result.analysis && (
                  <div key={idx} style={{ marginTop: "20px" }}>
                    <h4>Email Analysis for {result.email}</h4>
                    <div style={{ border: "1px solid #ccc", padding: "15px", borderRadius: "5px" }}>
                      {/* Authentication */}
                      <h3>Authentication</h3>
                      <details>
                        <summary>
                          {result.analysis.authentication?.dkim === "pass" &&
                          result.analysis.authentication?.spf === "pass" &&
                          result.analysis.authentication?.dmarc === "pass" &&
                          result.analysis.authentication.mxRecords === "pass"
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
                              <td>{result.analysis.authentication?.dkim === "pass" ? "Pass" : "Fail"}</td>
                            </tr>
                            <tr>
                              <td>SPF</td>
                              <td>{result.analysis.authentication?.spf === "pass" ? "Pass" : "Fail"}</td>
                            </tr>
                            <tr>
                              <td>DMARC</td>
                              <td>{result.analysis.authentication?.dmarc === "pass" ? "Pass" : "Fail"}</td>
                            </tr>
                            <tr>
                              <td>MX</td>
                              <td>{result.analysis.authentication.mxRecords === "pass" ? "Pass" : "Fail"}</td>
                            </tr>
                          </tbody>
                        </table>
                      </details>

                      {/* Domain Blacklist Check */}
                      <h3>Domain Blacklist Check</h3>
                      <details>
                        <summary>
                          {result.analysis.domainBlacklistCheck?.some(result => result.listed)
                            ? `Your domain is blacklisted on ${result.analysis.domainBlacklistCheck.filter(result => result.listed).length} blacklist(s).`
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
                            {result.analysis.domainBlacklistCheck?.map((blacklist, idx) => (
                              <tr key={idx}>
                                <td>{blacklist.blacklist}</td>
                                <td>{blacklist.listed ? "Listed" : "Not Listed"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </details>

                      {/* IP Blacklist Check */}
                      <h3>IP Blacklist Check</h3>
                      <details>
                        <summary>
                          {result.analysis.ipBlacklistCheck?.some(result => result.listed)
                            ? `Your IP is blacklisted on ${result.analysis.ipBlacklistCheck.filter(result => result.listed).length} blacklist(s).`
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
                            {result.analysis.ipBlacklistCheck?.map((blacklist, idx) => (
                              <tr key={idx}>
                                <td>{blacklist.blacklist}</td>
                                <td>{blacklist.listed ? "Listed" : "Not Listed"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </details>

                      {/* Email Details */}
                      <h3>Email Details</h3>
                      <details>
                        <summary>View Email Details</summary>
                        <p><strong>Subject:</strong> {result.analysis.subject || "No Subject"}</p>
                        <p><strong>From:</strong> {result.from || "Unknown Sender"}</p>
                        <p><strong>Date:</strong> {result.analysis.date || "Unknown Date"}</p>
                        <p><strong>Number of Links:</strong> {result.linkCount || 0}</p>
                      </details>

                      {/* Link Statuses */}
                      {result.analysis.linkStatuses && result.analysis.linkStatuses.length > 0 && (
                        <div>
                          <h3>Link Statuses</h3>
                          <details>
                            <summary>{result.analysis.linkStatuses.length} Links (Click to View Statuses)</summary>
                            <ul>
                              {result.analysis.linkStatuses.map((linkStatus, idx) => (
                                <li key={idx}>
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
                      {result.analysis.spamWordAnalysis && (
                        <div style={{ marginTop: "20px" }}>
                          <h3>Spam Word Analysis</h3>
                          <p>
                            <strong>Spam Words Found:</strong>{" "}
                            {result.analysis.spamWordAnalysis.spamWordsFound ? "Yes" : "No"}
                          </p>
                          {result.analysis.spamWordAnalysis.spamWordsFound && (
                            <details>
                              <summary>View Spam Words</summary>
                              <ul>
                                {result.analysis.spamWordAnalysis.spamWordsList.map((word, idx) => (
                                  <li key={idx}>{word}</li>
                                ))}
                              </ul>
                            </details>
                          )}
                        </div>
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
                            __html: parseEmailContent(result.analysis.emailContent),
                          }}
                        />
                      </details>
                    </div>
                  </div>
                )
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PreviousResults;