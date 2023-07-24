uniform vec3 color;

layout(location = 0) out vec4 gOutputColor;

void main() {
    gOutputColor = vec4(color, 1);
}
