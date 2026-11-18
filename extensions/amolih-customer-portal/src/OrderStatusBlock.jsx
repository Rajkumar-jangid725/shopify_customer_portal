import '@shopify/ui-extensions/preact';
import { render } from "preact";

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  return (
    <s-banner tone="info" title="Amolih Order Updates">
      <s-block-stack spacing="tight">
        <s-text>
          Thank you for choosing Amolih! Your package is being prepared with standard tracked shipping.
        </s-text>
        <s-button to="https://amolih.com/pages/contact" external variant="plain">
          Need Support? Contact Care &rarr;
        </s-button>
      </s-block-stack>
    </s-banner>
  );
}
