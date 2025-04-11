import { useEffect, useState } from 'react';
import supabase from './supabase';
import './style.css';

const CATEGORIES = [
  { name: 'technology', color: '#3b82f6' },
  { name: 'science', color: '#16a34a' },
  { name: 'finance', color: '#ef4444' },
  { name: 'society', color: '#eab308' },
  { name: 'entertainment', color: '#db2777' },
  { name: 'health', color: '#14b8a6' },
  { name: 'history', color: '#f97316' },
  { name: 'news', color: '#8b5cf6' },
];

function App() {
  const [showForm, setShowForm] = useState(false);
  const [facts, setFacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentCategory, setCurrentCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchFacts = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('facts')
          .select('*')
          .order('votesInteresting', { ascending: false });

        if (error) throw error;
        setFacts(data || []);
      } catch (error) {
        console.error('Error fetching facts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFacts();
  }, []);

  const filteredFacts = facts
    .filter(fact => currentCategory === 'all' || fact.category === currentCategory)
    .filter(fact => fact.text.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="app-container">
      <Header 
        searchTerm={searchTerm} 
        setSearchTerm={setSearchTerm} 
        showForm={showForm}
        setShowForm={setShowForm}
      />
      
      {showForm && (
        <NewFactForm 
          setFacts={setFacts} 
          setShowForm={setShowForm} 
          categories={CATEGORIES} 
        />
      )}

      <main className="main-content">
        <CategoryFilter 
          currentCategory={currentCategory} 
          setCurrentCategory={setCurrentCategory} 
        />
        
        {isLoading ? (
          <Loader />
        ) : (
          <FactList 
            facts={filteredFacts} 
            setFacts={setFacts} 
            currentCategory={currentCategory}
          />
        )}
      </main>
    </div>
  );
}

function Loader() {
  return <div className="loader">Loading facts...</div>;
}

function Header({ searchTerm, setSearchTerm, showForm, setShowForm }) {
  return (
    <header className="header">
      <div className="logo">
        <img src="logo.png" alt="Today I Learned Logo" />
        <h1>Today I Learned</h1>
      </div>
    
      <div className="header-controls">
        <button 
          className="btn btn-large"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Close' : 'Share a Fact'}
        </button>
        
        <div className="search-container">
          <input
            type="text"
            placeholder="Search facts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>
    </header>
  );
}

function NewFactForm({ setFacts, setShowForm, categories }) {
  const [text, setText] = useState('');
  const [source, setSource] = useState('');
  const [category, setCategory] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const textLength = text.length;

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!text || !isValidHttpUrl(source) || !category || textLength > 200) {
      alert('Please provide valid data (text < 200 chars, valid URL, and category)');
      return;
    }

    setIsUploading(true);
    
    try {
      const { data: newFact, error } = await supabase
        .from('facts')
        .insert([{ 
          text, 
          source, 
          category,
          votesInteresting: 0,
          votesMindblowing: 0,
          votesFalse: 0
        }])
        .select();

      if (error) throw error;

      setFacts(prev => [newFact[0], ...prev]);
      setText('');
      setSource('');
      setCategory('');
      setShowForm(false);
    } catch (err) {
      alert('Failed to add fact: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form className="fact-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Share a fact with the world..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={isUploading}
      />
      <span>{200 - textLength}</span>
      <input
        type="text"
        placeholder="Trustworthy source..."
        value={source}
        onChange={(e) => setSource(e.target.value)}
        disabled={isUploading}
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        disabled={isUploading}
      >
        <option value="">Choose category:</option>
        {categories.map(cat => (
          <option key={cat.name} value={cat.name}>
            {cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}
          </option>
        ))}
      </select>
      <button className="btn btn-large" disabled={isUploading}>
        Post
      </button>
    </form>
  );
}

function CategoryFilter({ currentCategory, setCurrentCategory }) {
  return (
    <aside className="category-sidebar">
      <ul>
        <li>
          <button
            className={`category-btn ${currentCategory === 'all' ? 'active' : ''}`}
            onClick={() => setCurrentCategory('all')}
          >
            All
          </button>
        </li>
        {CATEGORIES.map(cat => (
          <li key={cat.name}>
            <button
              className={`category-btn ${currentCategory === cat.name ? 'active' : ''}`}
              style={{ backgroundColor: cat.color }}
              onClick={() => setCurrentCategory(cat.name)}
            >
              {cat.name}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function FactList({ facts, setFacts, currentCategory }) {
  if (facts.length === 0) {
    return (
      <div className="no-facts">
        <p>No facts found {currentCategory !== 'all' ? `in ${currentCategory}` : ''}.</p>
      </div>
    );
  }

  return (
    <section className="facts-section">
      <div className="facts-grid">
        {facts.map(fact => (
          <Fact key={fact.id} fact={fact} setFacts={setFacts} />
        ))}
      </div>
    </section>
  );
}

function Fact({ fact, setFacts }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(fact.text);
  const isDisputed = fact.votesInteresting + fact.votesMindblowing < fact.votesFalse;

  async function handleVote(columnName) {
    const { data: updatedFact, error } = await supabase
      .from('facts')
      .update({ [columnName]: fact[columnName] + 1 })
      .eq('id', fact.id)
      .select();
    
    if (!error) {
      setFacts(prev => prev.map(f => f.id === fact.id ? updatedFact[0] : f));
    }
  }

  async function handleEdit() {
    const { data: updatedFact, error } = await supabase
      .from('facts')
      .update({ text: editedText })
      .eq('id', fact.id)
      .select();
    
    if (!error) {
      setFacts(prev => prev.map(f => f.id === fact.id ? updatedFact[0] : f));
      setIsEditing(false);
    }
  }

  return (
    <div className="fact-card">
      <div className="fact-content">
        {isEditing ? (
          <textarea
            className="edit-textarea"
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
          />
        ) : (
          <p className="fact-text">
            {isDisputed && <span className="disputed">[⛔ DISPUTED]</span>}
            {fact.text}
          </p>
        )}
        <a href={fact.source} className="fact-source" target="_blank" rel="noopener noreferrer">
          (Source)
        </a>
      </div>
      
      <div className="fact-footer">
        <span className="fact-category" style={{ backgroundColor: CATEGORIES.find(c => c.name === fact.category).color }}>
          {fact.category}
        </span>
        
        <div className="fact-actions">
          <button 
            className="edit-btn"
            onClick={() => isEditing ? handleEdit() : setIsEditing(true)}
          >
            {isEditing ? 'Save' : 'Edit'}
          </button>
          {isEditing && (
            <button 
              className="cancel-btn"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
      
      <div className="vote-buttons">
        <button onClick={() => handleVote('votesInteresting')}>
          👍 {fact.votesInteresting}
        </button>
        <button onClick={() => handleVote('votesMindblowing')}>
          🤯 {fact.votesMindblowing}
        </button>
        <button onClick={() => handleVote('votesFalse')}>
          ⛔️ {fact.votesFalse}
        </button>
      </div>
    </div>
  );
}

function isValidHttpUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

export default App;