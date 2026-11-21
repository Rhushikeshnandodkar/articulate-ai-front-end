import { CheckIcon } from './icons';

export const PROFESSION_OPTIONS = [
  { value: 'student', label: 'Student' },
  { value: 'professional', label: 'Professional' },
  { value: 'business owner', label: 'Business owner' },
];

export const GOAL_OPTIONS = [
  { value: 'interview', label: 'Interview preparation' },
  { value: 'public_speaking', label: 'Public speaking' },
  { value: 'confidence', label: 'Confidence building' },
  { value: 'sales', label: 'Sales communication' },
  { value: 'networking', label: 'Networking' },
  { value: 'english speaking', label: 'English speaking' },
];

export const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const SUGGESTED_INTERESTS = [
  'Technology', 'Startups', 'AI', 'Business', 'Leadership', 'Career growth',
  'Sports', 'Cricket', 'Movies', 'Music', 'Travel', 'Food',
  'Books', 'Science', 'History', 'Psychology', 'Finance', 'Politics',
];

function splitInterests(text) {
  return (text || '').split(',').map((s) => s.trim()).filter(Boolean);
}

function Choices({ name, options, value, onChange, small }) {
  return (
    <div className={`ui-choices ${small ? 'is-small' : ''}`} role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={`ui-choice ${value === o.value ? 'is-selected' : ''}`}
          onClick={() => onChange(name, o.value)}
        >
          {value === o.value && <CheckIcon />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Practice-profile fields shared by onboarding and the Settings edit dialog.
 * `form` holds the values; `onField(name, value)` updates one.
 */
export default function ProfileForm({ form, onField }) {
  const interests = splitInterests(form.interests_text);
  const lower = interests.map((i) => i.toLowerCase());

  const toggleInterest = (item) => {
    const next = lower.includes(item.toLowerCase())
      ? interests.filter((i) => i.toLowerCase() !== item.toLowerCase())
      : [...interests, item];
    onField('interests_text', next.join(', '));
  };

  return (
    <div className="ui-form">
      <div className="ui-field">
        <span className="ui-label">What do you want to get better at?</span>
        <Choices name="goal" options={GOAL_OPTIONS} value={form.goal} onChange={onField} />
      </div>

      <div className="ui-field">
        <span className="ui-label">Interests</span>
        <p className="ui-hint">We use these to pick topics you&apos;ll enjoy talking about. Tap to add, or type your own.</p>
        <input
          type="text"
          name="interests_text"
          className="ui-input"
          value={form.interests_text}
          onChange={(e) => onField('interests_text', e.target.value)}
          placeholder="cricket, music, coding"
          aria-label="Interests"
        />
        <div className="ui-choices is-small" style={{ marginTop: 4 }}>
          {SUGGESTED_INTERESTS.map((item) => {
            const on = lower.includes(item.toLowerCase());
            return (
              <button key={item} type="button" className={`ui-choice ${on ? 'is-selected' : ''}`} onClick={() => toggleInterest(item)} aria-pressed={on}>
                {on && <CheckIcon />}
                {item}
              </button>
            );
          })}
        </div>
      </div>

      <div className="profile-form-row">
        <div className="ui-field">
          <span className="ui-label">You are a</span>
          <Choices name="profession" options={PROFESSION_OPTIONS} value={form.profession} onChange={onField} small />
        </div>
        <div className="ui-field">
          <span className="ui-label">Speaking level</span>
          <Choices name="communication_level" options={LEVEL_OPTIONS} value={form.communication_level} onChange={onField} small />
        </div>
      </div>

      <div className="ui-field">
        <label className="ui-label" htmlFor="profile-bio">About you <span className="ui-optional">Optional</span></label>
        <textarea
          id="profile-bio"
          name="bio"
          className="ui-textarea"
          rows={3}
          value={form.bio}
          onChange={(e) => onField('bio', e.target.value)}
          placeholder="A line about your background or what you want to improve"
        />
      </div>
    </div>
  );
}
