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

1. Open StarUML.
2. Click **Tools** -> **Extension Manager...**. The Extension Manager window
   will appear as a pop window.
3. Select **Registry** button.
4. Type `ruby` on search box. Ruby extension will appear.
5. Press **Install** button of Ruby extension.

Note that internet connection is needed to perfom the installation.

StarUML extension repository stores extensions that officially registered.
Because of it, I **highly recommend** to use this method. Registered
extensions are available on [this page][starumlextension].

See [Installation][installation] for other installation methods.

## How to use this extension

Please, follow these steps below.

1. Click the menu (**Tools** -> **Ruby** -> **Generate Code...**).
2. Select a model which will be generated its code in the pop window. And then,
   click **OK**.
3. Select a location where the generated code will be saved.
4. The generated code will be saved in the place where you selected before.

## How to configure this extension

You can configure the extension before generating the code.

1. Click the menu (**Tools** -> **Ruby** -> **Configure...**).
2. Manage the configuration for code generation (there are some options there). You
   can always restore default configurations.
3. Click **Close** when you have configured it.

## Documentation

Documentation is available at [staruml-ruby GitHub Wiki][wiki]. Documentation
contains a lot more detail on examples, use and features, and roadmap.

## Contributing

Contributions are welcome. Before submitting an issue or a pull request, please
take a moment to look over the [contributing guidelines][contributing] first.

## License

This extension is released under the terms of MIT License. See the [LICENSE][license]
file for more details.

Copyright &copy; 2016 Andrias Meisyal.

[staruml]: http://staruml.io
[umlconcept]:
https://github.com/meisyal/staruml-ruby/wiki/Supported-UML-Concepts
[starumlextension]: http://staruml.io/extensions
[installation]: https://github.com/meisyal/staruml-ruby/wiki/Installation
[wiki]: https://github.com/meisyal/staruml-ruby/wiki
[contributing]:
https://github.com/meisyal/staruml-ruby/blob/master/CONTRIBUTING.md
[LICENSE]: https://github.com/meisyal/staruml-ruby/blob/master/LICENSE
