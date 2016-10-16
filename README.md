# staruml-ruby

staruml-ruby is a Ruby extension for [StarUML][staruml] 2. This extension helps you
to generate Ruby code from a UML class diagram.

## Current Status

This extension currently supports generating Ruby code from a UML class diagram.
Reverse engineering from Ruby code to a UML class diagram is not supported at
the moment.

Please, refer to [Supported UML concepts][umlconcept] page for futher details.

## Installation

The simplest way to install staruml-ruby is from StarUML extension repository.
This installation method is explained as follows:

1. Click **Tools** -> **Extension Manager...** on the menu bar of StarUML.
   The Extension Manager window will appear as a pop-up window.
2. Select **Registry** button.
3. Type `ruby` on search box. Ruby extension will appear.
4. Press **Install** button of Ruby extension.

Note that internet connection is needed to perfom the installation.

StarUML extension repository stores extensions that officially registered.
Because of it, I **highly recommend** to use this method. Registered
extensions are available on [this page][starumlextension].

See [Installation][installation] for other installation methods.

## Usage

When this extension is successfully installed, it's time to use the extension.
Prepare your model that contains a UML class diagram and then:

1. Click **Tools** -> **Ruby** -> **Generate Code...** on the menu bar of
   StarUML. A pop-up window will appear.
2. Choose a model that will be generated its code. And then, press **OK**
   button.
3. Select a location where the generated code will be stored.
4. Press **Open** button.

Your Ruby code is generated. :yay:

## Configuration

You can configure the extension before generating the code. The configuration
handles indentation of code, code comment, and etc. This is supported by the
extension to generate the code, as you prefer.

Check [Configuration][configuration] to configure the extension.

## Documentation

Documentation is available at [staruml-ruby GitHub Wiki][wiki]. Documentation
contains a lot more detail on examples, features, and roadmap.

## Contributing

Contributions are welcome. Before submitting an issue or a pull request, please
take a moment to look over the [contributing guidelines][contributing] first.

## License

This extension is released under the terms of MIT License. See the
[LICENSE][license] file for more details.

Copyright &copy; 2016 Andrias Meisyal.

[staruml]: http://staruml.io
[umlconcept]:
https://github.com/meisyal/staruml-ruby/wiki/Supported-UML-Concepts
[starumlextension]: http://staruml.io/extensions
[installation]: https://github.com/meisyal/staruml-ruby/wiki/Installation
[configuration]: https://github.com/meisyal/staruml-ruby/wiki/Configuration
[wiki]: https://github.com/meisyal/staruml-ruby/wiki
[contributing]:
https://github.com/meisyal/staruml-ruby/blob/master/CONTRIBUTING.md
[LICENSE]: https://github.com/meisyal/staruml-ruby/blob/master/LICENSE
