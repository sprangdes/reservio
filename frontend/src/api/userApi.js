export async function createUser(data) {
    const response = await fetch("http://localhost:8080/reservio/user/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "建立使用者失敗");
    }
    return response;
}