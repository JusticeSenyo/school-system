// Enhanced AddClassesSubjectsPage.js with Edit/Delete for Classes and Subjects
import React, { useState } from 'react';
import { nanoid } from 'nanoid';
import { useNavigate } from 'react-router-dom';
import OnboardingProgressBar from '../components/OnboardingProgressBar';

const AddClassesSubjectsPage = () => {
  const navigate = useNavigate();

  const [className, setClassName] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [classes, setClasses] = useState([]);
  const [editingClassId, setEditingClassId] = useState(null);
  const [editingClassName, setEditingClassName] = useState('');
  const [editingSubject, setEditingSubject] = useState({ classId: null, subjectId: null, name: '', teacher: '' });

  const handleAddClass = (e) => {
    e.preventDefault();
    if (!className.trim()) return;
    const newClass = {
      id: nanoid(),
      name: className.trim(),
      subjects: [],
    };
    setClasses([...classes, newClass]);
    setClassName('');
  };

  const handleDeleteClass = (id) => {
    setClasses(classes.filter(cls => cls.id !== id));
  };

  const startEditClass = (cls) => {
    setEditingClassId(cls.id);
    setEditingClassName(cls.name);
  };

  const saveClassEdit = () => {
    setClasses(classes.map(cls => cls.id === editingClassId ? { ...cls, name: editingClassName } : cls));
    setEditingClassId(null);
    setEditingClassName('');
  };

  const cancelClassEdit = () => {
    setEditingClassId(null);
    setEditingClassName('');
  };

  const handleAddSubject = (classId) => {
    if (!subjectName.trim()) return;
    const updated = classes.map((cls) =>
      cls.id === classId
        ? {
            ...cls,
            subjects: [
              ...cls.subjects,
              {
                id: nanoid(),
                name: subjectName.trim(),
                teacher: teacherName.trim(),
              },
            ],
          }
        : cls
    );
    setClasses(updated);
    setSubjectName('');
    setTeacherName('');
  };

  const handleDeleteSubject = (classId, subjectId) => {
    const updated = classes.map((cls) =>
      cls.id === classId
        ? {
            ...cls,
            subjects: cls.subjects.filter((subj) => subj.id !== subjectId),
          }
        : cls
    );
    setClasses(updated);
  };

  const startEditSubject = (clsId, subj) => {
    setEditingSubject({ classId: clsId, subjectId: subj.id, name: subj.name, teacher: subj.teacher });
  };

  const saveSubjectEdit = () => {
    const updated = classes.map(cls =>
      cls.id === editingSubject.classId
        ? {
            ...cls,
            subjects: cls.subjects.map(subj =>
              subj.id === editingSubject.subjectId
                ? { ...subj, name: editingSubject.name, teacher: editingSubject.teacher }
                : subj
            ),
          }
        : cls
    );
    setClasses(updated);
    setEditingSubject({ classId: null, subjectId: null, name: '', teacher: '' });
  };

  const cancelSubjectEdit = () => {
    setEditingSubject({ classId: null, subjectId: null, name: '', teacher: '' });
  };

  return (
    <div className="min-h-screen bg-blue-50 p-6 flex justify-center items-start">
      <div className="w-full max-w-4xl bg-white p-10 rounded-xl shadow-xl">
        <OnboardingProgressBar />

        <h2 className="text-3xl font-bold text-center text-indigo-700 mb-2">
          Add Classes & Subjects
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          Create your school's academic structure by adding class levels and subjects.
        </p>

        {/* Add Class Form */}
        <form onSubmit={handleAddClass} className="flex gap-4 mb-8">
          <input
            type="text"
            placeholder="e.g. Grade 1"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            className="flex-1 border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-indigo-400"
            required
          />
          <button
            type="submit"
            className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 transition"
          >
            Add Class
          </button>
        </form>

        {/* Display Each Class */}
        {classes.map((cls) => (
          <div key={cls.id} className="mb-6 p-5 bg-gray-50 border border-gray-200 rounded-lg transition-all">
            {editingClassId === cls.id ? (
              <div className="flex items-center mb-3 gap-3">
                <input
                  value={editingClassName}
                  onChange={(e) => setEditingClassName(e.target.value)}
                  className="border rounded px-3 py-2 flex-1"
                />
                <button onClick={saveClassEdit} className="text-green-600 text-sm">Save</button>
                <button onClick={cancelClassEdit} className="text-gray-500 text-sm">Cancel</button>
              </div>
            ) : (
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-indigo-700">{cls.name}</h3>
                <div className="space-x-3">
                  <button onClick={() => startEditClass(cls)} className="text-indigo-600 text-sm hover:underline">Edit</button>
                  <button onClick={() => handleDeleteClass(cls.id)} className="text-red-600 text-sm hover:underline">Delete</button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
              <input
                type="text"
                placeholder="Subject"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-400"
              />
              <input
                type="text"
                placeholder="Teacher (optional)"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-400"
              />
              <button
                type="button"
                onClick={() => handleAddSubject(cls.id)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
              >
                Add Subject
              </button>
            </div>

            {/* Subjects List */}
            {cls.subjects.length > 0 ? (
              <ul className="text-sm text-gray-800 space-y-1 mt-2">
                {cls.subjects.map((subj) => (
                  <li key={subj.id} className="flex justify-between items-center">
                    {editingSubject.subjectId === subj.id && editingSubject.classId === cls.id ? (
                      <div className="flex flex-1 items-center gap-2">
                        <input
                          value={editingSubject.name}
                          onChange={(e) => setEditingSubject({ ...editingSubject, name: e.target.value })}
                          className="border rounded px-2 py-1 flex-1"
                        />
                        <input
                          value={editingSubject.teacher}
                          onChange={(e) => setEditingSubject({ ...editingSubject, teacher: e.target.value })}
                          className="border rounded px-2 py-1 flex-1"
                        />
                        <button onClick={saveSubjectEdit} className="text-green-600 text-xs">Save</button>
                        <button onClick={cancelSubjectEdit} className="text-gray-500 text-xs">Cancel</button>
                      </div>
                    ) : (
                      <span className="flex-1">
                        <span className="font-medium text-gray-900">{subj.name}</span>
                        {subj.teacher && (
                          <span className="text-gray-500"> — {subj.teacher}</span>
                        )}
                      </span>
                    )}
                    {editingSubject.subjectId !== subj.id && (
                      <span className="ml-3 space-x-3 text-xs">
                        <button
                          onClick={() => startEditSubject(cls.id, subj)}
                          className="text-indigo-600 hover:underline"
                        >Edit</button>
                        <button
                          onClick={() => handleDeleteSubject(cls.id, subj.id)}
                          className="text-red-500 hover:underline"
                        >Delete</button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400 italic">No subjects added yet.</p>
            )}
          </div>
        ))}

        <div className="flex justify-between items-center border-t pt-6">
          <button
            onClick={() => navigate('/setup/add-users')}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            ← Back to Users
          </button>

          <button
            onClick={() => navigate('/setup/fees')}
            className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 transition"
          >
            Continue to Fees Setup →
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddClassesSubjectsPage;
