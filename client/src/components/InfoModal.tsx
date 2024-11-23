import { Modal } from './Modal';
import '../styles/InfoModal.css';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InfoModal({ isOpen, onClose }: InfoModalProps) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="About Duolingo by Diary">
      <p>In Hong Sang Soo's film <i>The Traveler's Needs</i>, Isabella Huppert plays a French teacher with unusual pedagogy. Instead of asking students to recite rote "common tools" such as "Where is the post office?" and "I think bread is delicious!", she follows the students around in their lives as they eat, drink, and be merry. And when the student does something she deems meaningful, she asks the student how they felt as they did that.</p>
      <p>After the student describes their emotions, Huppert's character extracts the latent feelings underneath as a therapist would and translates those feelings and the context in which they arose into French. She then asks the student to, in their own time, speak the words into a recorder as many times as they can bear.</p>
      <p>By associating the act of language learning with meaningful feelings and moments, one can perhaps internalize the language more deeply and maybe even speak more meaningful phrases. For going to the post office is not a daily occuurrence for most in the 21st century, but the gammut of the human experience transcenes any language.</p>
      <p>I hope this application can accomplish something similar. After writing about an incident you went through and how you felt, the system will attempt to grok the true essence and translate that emotion. You can then listen to a recording of it, and finally, you can make your own recording.</p>
      <p>Recordings are stored for a week, upon which they disappear into the ether, just as the casettes Huppert's students vocalized into will inevitably decay. Hopefully however, your intimacy with the language remains.</p>
      <p>Interpretation, translation, and text to speech provided by OpenAI.</p>
    </Modal>
  );
}