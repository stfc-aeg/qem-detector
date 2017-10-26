function TestAdapter(app, mount, name, meta)
{
    this.layout = new TestLayout(app, meta);
    this.layout.name = name;
    mount.innerHTML = this.layout.generate("main");
    this.layout.sendInit();
}

TestAdapter.prototype.update =
    function(data)
    {
        this.layout.sendUpdate(data);
    }:
