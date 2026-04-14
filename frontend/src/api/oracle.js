// src/api/oracle.js
import axios from 'axios'

const BASE = 'http://localhost:8000/api/v1'

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
})

export const oracleApi = {
  // Full SchemaIR — tables, columns, FK edges, score
  analyzeSchema: (repoId) =>
    axios.get(`${BASE}/oracle/analyze/${repoId}/`, authHeaders()),

  // Oracle DDL string + warnings
  getDDL: (repoId) =>
    axios.get(`${BASE}/oracle/ddl/${repoId}/`, authHeaders()),

  // Download ZIP (oracle_ddl.sql + index_recommendations.sql + migration_notes.md)
  exportZip: (repoId) =>
    axios.get(`${BASE}/oracle/export/${repoId}/`, {
      ...authHeaders(),
      responseType: 'blob',
    }),

  // Oracle AI advisory (Llama3 + Oracle framing)
  getAIReview: (repoId) =>
    axios.get(`${BASE}/oracle-ai/review/${repoId}/`, authHeaders()),
}