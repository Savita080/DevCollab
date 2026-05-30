# DevCollab AI Microservices: Mathematical & Architectural Whitepaper

This document provides a rigorous, deep-dive exploration into the internal mechanics of the DevCollab AI Microservices. It is tailored for multidisciplinary experts encompassing software engineering, data science, and mathematics. The system employs a hybrid approach, leveraging deterministic mathematical models, statistical distributions, directed graph theory, heuristic Abstract Syntax Tree (AST) parsing, and Large Language Models (LLMs).

---

## 1. Blockage Identifier (`blocker`)

The Blockage Identifier utilizes a four-stage pipeline combining probabilistic statistics, NLP sentiment analysis, and graph theory to identify project bottlenecks.

### Step 1.1: Log-Normal Baseline for Stall Detection
Task completion times inherently suffer from positive skewness; most tasks finish quickly, but the tail extends infinitely to the right. A simple Gaussian distribution or arithmetic mean is statistically inappropriate. 

The system fits historical `DONE` / `IN_REVIEW` task durations to a **Log-Normal Distribution**, grouped by Priority level ($P_0, P_1, P_2$).

For a given priority bucket with durations $D = \{d_1, d_2, \dots, d_n\}$:
$$ \mu = \frac{1}{n}\sum_{i=1}^{n} \ln(d_i) \quad,\quad \sigma = \sqrt{\frac{1}{n-1}\sum_{i=1}^{n} (\ln(d_i) - \mu)^2} $$

For an active task currently lasting $t$ hours, we calculate its Z-score ($z$) in logarithmic space:
$$ z = \frac{\ln(t) - \mu}{\sigma} $$

A task is mathematically classified as **stalled** if $z > 1.645$ (the statistical threshold for the 95th percentile). If sufficient historical data ($n < 5$) is unavailable, it defaults to a deterministic static threshold of $t > 72$ hours. 

The percentile rank is dynamically calculated using the complementary error function:
$$ \text{Percentile} = 100 \times \left(1 - \frac{1}{2}\text{erfc}\left(\frac{z}{\sqrt{2}}\right)\right) $$

### Step 1.2: Exponential Urgency Decay
Once a task is stalled, its urgency score $S$ is calculated based on the hours elapsed since its last update ($\Delta t$). It utilizes an exponential saturation function mimicking half-life decay, parameterized by priority-specific lambda ($\lambda$) constants:
$$ S = 1 - e^{-\lambda \Delta t} $$
Where $\lambda_{P0} = 0.05$, $\lambda_{P1} = 0.02$, and $\lambda_{P2} = 0.008$. 

### Step 2: NLP Sentiment & Semantic Similarity
For stalled tasks, the engine processes all conversational data (comments):
1. **Valence Aware Dictionary and sEntiment Reasoner (VADER)**: Computes a normalized, weighted composite polarity score (`compound`). Comments with a score $< -0.3$ are tagged as friction-carrying.
2. **LLM Semantic Vectorization**: The task description and comments are concatenated and passed to a generative model (`llama-3.3-70b-versatile`). The LLM yields pseudo-cosine similarity scores ($0.0 \rightarrow 1.0$) mapped directly to predefined ontological vectors: `access`, `dependency`, and `requirements`.

### Step 3: Filtered Directed Mention Graphs ($C_D$)
To locate the human bottleneck, the system relies on Directed Graph Theory, specifically **In-Degree Centrality ($C_D^-$)**.

Crucially, this graph is built *exclusively* from the negative comments identified by VADER in Step 2. This isolates actual friction and discards positive/neutral noise.
* Let graph $G = (V, E)$. Vertices $V$ are users.
* A directed edge $e = (u, v)$ is drawn if User $u$ mentions `@v` in a negative comment.
* **In-degree ($C_D^-(v)$)**: The total number of edges terminating at vertex $v$. The user with the highest global in-degree across all stalled tasks is programmatically identified as the `global_bottleneck_user`.

### Step 4: DAG Dependency Multiplier
The system traverses the task dependency metadata (`depends_on`). If a stalled task has an in-degree $> 0$ within the dependency DAG (i.e., other active tasks are blocked by it), a severity multiplier is applied to its urgency score, propagating its priority upwards.

---

## 2. Project Summary (`progressSummary`)

This service generates a multidimensional project `Health Score` ($\mathcal{H} \in [0, 100]$) using a weighted, deterministic linear combination of 5 normalized signals ($\mathcal{S}_i$).

$$ \mathcal{H} = \min\left(100, \sum_{i=1}^{5} \mathcal{S}_i\right) $$

The signals and their piecewise linear mappings are:

1. **Completion Rate ($w_1 = 35$)**: 
   $$ \mathcal{S}_1 = w_1 \times \left(\frac{N_{\text{done}}}{N_{\text{total}}}\right) $$
2. **Overdue Penalty ($w_2 = 25$)**: 
   $$ \mathcal{S}_2 = w_2 \times \left(1 - \frac{N_{\text{overdue}}}{N_{\text{with\_due\_date}}}\right) $$
3. **Velocity Score ($w_3 = 20$)**: Evaluates a 7-day trailing window against an expected baseline of 20% total backlog completion.
   $$ \mathcal{S}_3 = w_3 \times \min\left(1.0, \frac{N_{\text{completed\_last\_7d}}}{N_{\text{total}} \times 0.20}\right) $$
4. **Priority Balance ($w_4 = 10$)**: Punishes high concentrations of open critical tasks.
   $$ \mathcal{S}_4 = w_4 \times \left(1 - \frac{N_{\text{open\_P0\_P1}}}{N_{\text{open\_total}}}\right) $$
5. **Stale Penalty ($w_5 = 10$)**:
   $$ \mathcal{S}_5 = w_5 \times \left(1 - \frac{N_{\text{stale}}}{N_{\text{in\_progress}}}\right) $$
   *(Stale is defined as `IN_PROGRESS` and $t_{\text{updated}} > t_{\text{threshold}}$).*

The resulting $\mathcal{H}$ scalar is fed into the LLM context window alongside the raw arrays, allowing the LLM to synthesize natural language insights categorized deterministically as `positive`, `warning`, or `blocker`.

---

## 3. Standup Report (`standupReport`)

The Standup Report calculates an **Activity Pulse** and utilizes a **MapReduce** LLM pipeline to ingest high-velocity data.

### 3.1: Activity Pulse (Exponential Saturation)
Simply summing activity events (chat messages, task moves) creates unbounded scores ($0 \rightarrow \infty$). To map $N$ discrete events into a closed bounded range $[0, 100]$, the system employs a negative exponential saturation function:

$$ f(x, k) = 100 \times \left(1 - e^{-kx}\right) $$

Where $k$ governs the rate of asymptotic approach (diminishing marginal returns):
* **Chat Messages ($k = 0.05$)**: Saturates slowly. Requires $\sim 60$ messages to hit $95/100$.
* **Task Moves ($k = 0.2$)**: Saturates moderately. Requires $\sim 15$ tasks to hit $95/100$.
* **Wiki Edits ($k = 0.3$)**: Saturates quickly. Requires $\sim 10$ edits to hit $95/100$.

The final pulse $\mathcal{P}$ is the weighted linear combination:
$$ \mathcal{P} = 0.2 \cdot f(x_{\text{chat}}, 0.05) + 0.4 \cdot f(x_{\text{tasks}}, 0.2) + 0.4 \cdot f(x_{\text{wiki}}, 0.3) $$

### 3.2: MapReduce NLP Summarization
Context window limitations and quadratic attention scaling ($\mathcal{O}(N^2)$) in transformers make processing massive chat logs computationally intractable. 
1. **Map Step**: The message vector is partitioned into $M$ chunks (max 30 messages). Each chunk is passed to a lower-latency, computationally cheaper LLM (e.g., `llama-3.1-8b-instant`) to extract a lossy, intermediate summary.
2. **Reduce Step**: The $M$ intermediate summaries are concatenated and passed to a high-capability reasoning model (`llama-3.3-70b-versatile`) to generate the final 3-5 macro-level bullet points.

---

## 4. AI Code Reviewer (`aiCodeReviewer`)

The Code Reviewer relies on an asymmetrical pipeline: a strict, deterministic AST pre-flight followed by a highly concurrent LLM multi-agent framework.

### 4.1: Static AST Pre-flight
Rather than expending GPU cycles on syntax checking, the pipeline heavily utilizes AST traversal:
1. `ast.parse`: Confirms grammatical correctness. Halts execution if a fatal `SyntaxError` is raised.
2. `pyflakes`: Identifies semantic anomalies (undefined variables, invalid redefinitions).
3. `vulture`: Traverses the AST looking for unreferenced nodes (dead code mapping).
4. `tree-sitter`: Generates a concrete syntax tree (CST). Cross-references comment nodes against regex heuristics (e.g., `^\s*def `) to detect commented-out executable code blocks.

The preflight engine produces a sanitized `dead_code_free_code` string, replacing dead lines with blanks to strictly preserve zero-indexed line mappings.

### 4.2: Concurrent Multi-Agent Scoring
The system spawns 6 independent LLM agents (`UnusedCode`, `Syntax`, `Security`, `Readability`, `Performance`, `EdgeCase`) running concurrently via Python's `ThreadPoolExecutor`.

Each agent $i$ processes the sanitized code and yields a score $S_i \in [0, 100]$. The orchestrator accepts an inbound configuration dictionary of weights $W$. The final code rating $\mathcal{R}$ is the normalized weighted arithmetic mean:

$$ \mathcal{R} = \frac{\sum_{i=1}^{6} S_i \cdot w_i}{\sum_{i=1}^{6} w_i} $$
