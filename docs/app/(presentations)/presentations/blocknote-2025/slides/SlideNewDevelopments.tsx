import { ContentSlide } from "../../_components/ContentSlide";
import { SlideHeading } from "../../_components/SlideHeading";

export const SlideNewDevelopments = () => {
  return (
    <ContentSlide title="New Developments">
      <div className="grid grid-cols-3 gap-8">
        {/* Features */}
        <div>
          <SlideHeading className="mb-4 text-purple-600">Features</SlideHeading>
          <ul className="space-y-3 text-2xl text-stone-600">
            <li>Exporter system (ODT, PDF, Docx)</li>
            <li>Comments & Threads</li>
            <li>AI integration</li>
            <li>Page breaks</li>
            <li>Block quotes, toggles</li>
            <li>Advanced tables & code blocks</li>
            <li>Animated collaboration cursors</li>
          </ul>
        </div>

        {/* Enhancements */}
        <div>
          <SlideHeading className="mb-4">Enhancements</SlideHeading>
          <ul className="space-y-3 text-2xl text-stone-600">
            <li>Block change detection</li>
            <li>Collaboration Performance</li>
            <li>Copy/Paste improvements</li>
            <li>Drag & Drop revisited</li>
            <li>Signed releases</li>
            <li>Improved docs and website</li>
          </ul>
        </div>

        {/* Refactors */}
        <div>
          <SlideHeading className="mb-4">Refactors</SlideHeading>
          <ul className="space-y-3 text-2xl text-stone-600">
            <li>Block Internals</li>
            <li>Extension system foundation</li>
          </ul>
        </div>
      </div>
    </ContentSlide>
  );
};
